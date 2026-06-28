/* ============================================================
   BLANE — FNRI Data Importer
   Uploads your DOST-FNRI.json file into the
   fnri_food_composition Supabase table.

   USAGE:
     1. npm install @supabase/supabase-js
     2. Fill in SUPABASE_URL and SUPABASE_SERVICE_KEY below
        (use the service_role key, NOT the anon key, since RLS
        blocks anon inserts)
     3. node import-fnri.js path/to/DOST-FNRI.json
   ============================================================ */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL        = 'https://jszolfwdnqxhppphzvhj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzem9sZndkbnF4aHBwcGh6dmhqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTgwNzcxMSwiZXhwIjoyMDk1MzgzNzExfQ.PYjigOrwjlI5BKcYQAb30dnXzXi0oDiPaAftUdllEus'; // Settings → API → service_role

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function importFnriData(filePath) {
  console.log('Reading', filePath, '...');
  const raw  = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  console.log(`Found ${data.length} food items. Uploading in batches of 500...`);

  const BATCH_SIZE = 500;
  let uploaded = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE).map((item) => ({
      fct_id:                     item.fct_id,
      food_name:                  item.food_name,
      alternate_name:             item.alternate_name || null,
      base_weight_g:              item.base_weight_g ?? 100,
      moisture_g:                 item.moisture_g ?? null,
      energy_kcal:                item.energy_kcal ?? null,
      protein_g:                  item.protein_g ?? null,
      total_fat_g:                item.total_fat_g ?? null,
      available_carbohydrate_g:   item.available_carbohydrate_g ?? null,
      dietary_fiber_g:             item.dietary_fiber_g ?? null,
      ash_g:                      item.ash_g ?? null,
    }));

    const { error } = await supabase
      .from('fnri_food_composition')
      .upsert(batch, { onConflict: 'fct_id' });

    if (error) {
      console.error('Batch failed at index', i, error.message);
      process.exit(1);
    }

    uploaded += batch.length;
    console.log(`Uploaded ${uploaded} / ${data.length}`);
  }

  console.log('✓ Import complete!');
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node import-fnri.js path/to/DOST-FNRI.json');
  process.exit(1);
}

importFnriData(filePath);