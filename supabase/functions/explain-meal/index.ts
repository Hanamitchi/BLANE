// ============================================================
// BLANE — Explainable AI Edge Function (Module 07, Gemini-powered)
// Path: supabase/functions/explain-meal/index.ts
//
// Receives: { mealId, meal, profile, healthLogs }
// Does:
//   1. Checks ai_explanations cache table (user_id + meal_id + profile_hash)
//   2. If cached and fresh -> streams cached text back immediately
//   3. If not cached -> looks up FNRI nutrient data for the meal's
//      ingredients, builds a grounded prompt, calls Gemini 2.5 Flash
//      Lite with streaming, saves the final text to cache, and
//      streams chunks back to the browser as Server-Sent Events.
//
// Required Supabase secrets (set via `supabase secrets set`):
//   GEMINI_API_KEY        -> your Google AI Studio API key
//   SUPABASE_URL          -> auto-provided by Supabase
//   SUPABASE_SERVICE_ROLE_KEY -> auto-provided by Supabase
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL    = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ============================================================
   MAIN HANDLER
   ============================================================ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing authorization header", 401);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Verify the caller's JWT and get their user id
    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return jsonError("Invalid session", 401);
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { mealId, meal, profile } = body;

    if (!meal || !meal.name) {
      return jsonError("Missing meal data", 400);
    }

    // ---- Build a deterministic hash of the inputs that affect the explanation ----
    const profileHash = await hashProfile(profile, mealId);

    // ---- 1. Check cache ----
    const { data: cached } = await supabase
      .from("ai_explanations")
      .select("verdict, verdict_label, explanation_text, flagged_condition")
      .eq("user_id", userId)
      .eq("meal_id", mealId)
      .eq("profile_hash", profileHash)
      .maybeSingle();

    if (cached?.explanation_text) {
      return streamCachedResult(cached);
    }

    // ---- 2. Look up FNRI nutrient data for this meal's ingredients ----
    const ingredientNames: string[] = (meal.ingredients || []).map((i: any) =>
      typeof i === "string" ? i : i.name
    );

    const { data: fctMatches } = await supabase
      .from("fnri_food_composition")
      .select("food_name, alternate_name, energy_kcal, protein_g, total_fat_g, available_carbohydrate_g, dietary_fiber_g")
      .or(
        ingredientNames
          .map((n) => `food_name.ilike.%${escapeLike(n)}%,alternate_name.ilike.%${escapeLike(n)}%`)
          .join(",")
      )
      .limit(20);

    // ---- 3. Build the Gemini prompt ----
    const prompt = buildPrompt(meal, profile, fctMatches || []);

    // ---- 4. Call Gemini with streaming, requesting structured JSON ----
    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 420,
          topP: 0.9,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              verdict: {
                type: "STRING",
                enum: ["safe", "caution", "avoid"],
                description:
                  "safe = no conflicts with user's conditions/allergies/diet. " +
                  "caution = minor concern (e.g. slightly high sodium for a mild condition, or doesn't perfectly fit the goal). " +
                  "avoid = serious conflict, especially a named allergy or a major medical contraindication.",
              },
              verdict_label: {
                type: "STRING",
                description: "Short label to display, e.g. 'Safe for You', 'Caution', or 'Avoid'.",
              },
              explanation: {
                type: "STRING",
                description:
                  "3-4 warm, plain-language sentences explaining why this meal fits (or doesn't fit) " +
                  "the user's goal, health profile, and budget. No markdown.",
              },
              flagged_condition: {
                type: "STRING",
                description:
                  "If verdict is 'avoid' due to an allergy or serious medical conflict, name the exact " +
                  "condition/allergy and the specific ingredient responsible. Leave empty string if verdict is 'safe' " +
                  "or if it's just a minor 'caution' — minor concerns should stay general in the explanation instead.",
              },
            },
            required: ["verdict", "verdict_label", "explanation", "flagged_condition"],
          },
        },
      }),
    });

    if (!geminiRes.ok || !geminiRes.body) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return jsonError("AI service unavailable, please try again.", 502);
    }

    // ---- 5. Gemini streams partial JSON chunks. We accumulate the full ----
    //         JSON string first (structured output can't be parsed mid-way),
    //         then emit a clean verdict event followed by a word-by-word
    //         "typing" stream of the explanation text for the UI.
    let rawJsonText = "";
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiRes.body!.getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const textPart =
                parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (textPart) rawJsonText += textPart;
            } catch (_e) {
              // ignore malformed partial chunk
            }
          }
        }

        // ---- Parse the complete structured response ----
        let result;
        try {
          result = JSON.parse(rawJsonText);
        } catch (_e) {
          console.error("Failed to parse Gemini JSON:", rawJsonText);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "AI response was malformed." })}\n\n`)
          );
          controller.close();
          return;
        }

        const verdict      = result.verdict || "safe";
        const verdictLabel  = result.verdict_label || "Safe for You";
        const explanation   = result.explanation || "";
        const flagged       = result.flagged_condition || "";

        // Emit the verdict first so the UI can render the badge immediately
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ verdict, verdict_label: verdictLabel, flagged_condition: flagged })}\n\n`
          )
        );

        // Then "type out" the explanation word by word for the streaming feel
        const words = explanation.split(" ");
        for (const word of words) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: word + " " })}\n\n`));
          await new Promise((r) => setTimeout(r, 14));
        }

        // Save the structured result to cache
        await supabase.from("ai_explanations").upsert({
          user_id: userId,
          meal_id: mealId,
          profile_hash: profileHash,
          verdict,
          verdict_label: verdictLabel,
          explanation_text: explanation,
          flagged_condition: flagged,
          created_at: new Date().toISOString(),
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("explain-meal error:", err);
    return jsonError("Something went wrong generating the explanation.", 500);
  }
});

/* ============================================================
   PROMPT BUILDER
   Grounds Gemini in the user's real profile + FNRI nutrient data
   ============================================================ */
function buildPrompt(meal: any, profile: any, fctMatches: any[]): string {
  const goal       = profile?.goal || "maintain";
  const age        = profile?.age || "unknown";
  const sex        = profile?.sex || "unknown";
  const height     = profile?.height_cm || "unknown";
  const weight     = profile?.weight_kg || "unknown";
  const activity   = profile?.activity_level || "moderate";
  const dietary    = (profile?.dietary_restrictions || []).join(", ") || "none";
  const medical    = (profile?.medical_conditions || []).join(", ") || "none";

  const fctText = fctMatches.length
    ? fctMatches
        .map(
          (f) =>
            `- ${f.food_name} (${f.alternate_name || "—"}): ${f.energy_kcal} kcal, ${f.protein_g}g protein, ${f.total_fat_g}g fat, ${f.available_carbohydrate_g}g carbs per 100g [DOST-FNRI Philippine Food Composition Table]`
        )
        .join("\n")
    : "No exact FNRI match found for this meal's ingredients — rely on the meal's own listed macros.";

  return `You are BLANE's nutrition assistant. A Filipino user just opened the "Why?" explanation for a meal recommended to them. Use the REAL data below — never invent numbers, allergens, or conditions not listed.

USER PROFILE:
- Age: ${age}, Sex: ${sex}, Height: ${height} cm, Weight: ${weight} kg
- Activity level: ${activity}
- Health goal: ${goal}
- Dietary restrictions: ${dietary}
- Medical conditions: ${medical}

RECOMMENDED MEAL: ${meal.name} (${meal.type || "meal"})
- Calories: ${meal.kcal} kcal
- Protein: ${meal.protein}g | Carbs: ${meal.carbs}g | Fats: ${meal.fats}g
- Estimated cost: ₱${meal.cost || "N/A"}
- Ingredients: ${(meal.ingredients || []).map((i: any) => (typeof i === "string" ? i : i.name)).join(", ")}

DOST-FNRI PHILIPPINE FOOD COMPOSITION TABLE DATA FOR THESE INGREDIENTS:
${fctText}

VERDICT RULES (apply in this order):
1. "avoid" — ONLY if an ingredient directly conflicts with a listed ALLERGY (e.g. nut_allergy, shellfish_allergy, egg_free, soy_free) or is a serious, well-established contraindication for a listed medical condition (e.g. high-purine food for gout, very high sodium for severe hypertension). When this happens, name the EXACT ingredient and condition/allergy responsible in flagged_condition, and be directly clear about it in the explanation — the user needs to know plainly.
2. "caution" — for minor mismatches: a dietary preference not perfectly met, a mild macro mismatch with the goal, or a small overlap with a medical condition that isn't serious. Keep this GENERAL in the explanation (e.g. "a little higher in sodium than ideal") — do NOT dramatize minor issues or repeat the exact condition name. Leave flagged_condition empty.
3. "safe" — no conflicts at all. Leave flagged_condition empty.

Write the explanation in 3-4 short, warm sentences like a friendly Filipino nutritionist talking directly to the user ("you"). Reference at least one real nutrient figure from the meal or FNRI data above. Plain sentences only, no markdown, no bullet points.

Respond ONLY with the JSON object matching the required schema.`;
}

/* ============================================================
   HELPERS
   ============================================================ */
async function hashProfile(profile: any, mealId: string): Promise<string> {
  const relevant = JSON.stringify({
    mealId,
    goal: profile?.goal,
    age: profile?.age,
    sex: profile?.sex,
    height: profile?.height_cm,
    weight: profile?.weight_kg,
    activity: profile?.activity_level,
    dietary: (profile?.dietary_restrictions || []).slice().sort(),
    medical: (profile?.medical_conditions || []).slice().sort(),
  });
  const data = new TextEncoder().encode(relevant);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function escapeLike(str: string): string {
  return str.replace(/[%_]/g, "");
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// When the answer is already cached, replay it as a fake SSE stream —
// verdict first, then the explanation typed out word by word — so the
// frontend's renderer behaves identically to a fresh Gemini call.
function streamCachedResult(cached: {
  verdict: string;
  verdict_label: string;
  explanation_text: string;
  flagged_condition: string | null;
}): Response {
  const encoder = new TextEncoder();
  const words = cached.explanation_text.split(" ");

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            verdict: cached.verdict,
            verdict_label: cached.verdict_label,
            flagged_condition: cached.flagged_condition || "",
          })}\n\n`
        )
      );

      for (const word of words) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: word + " " })}\n\n`));
        await new Promise((r) => setTimeout(r, 10)); // faster replay since it's cached
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, cached: true })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}