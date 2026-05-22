// Nutrient bar data (percentage, capped at 100 for display)
  var nutrients = [
    { barId: "bar-protein", value: 78 },
    { barId: "bar-fiber",   value: 91 },
    { barId: "bar-iron",    value: 55 },
    { barId: "bar-vitc",    value: 100 }
  ];

  // Set bar widths after DOM is ready
  nutrients.forEach(function(n) {
    var el = document.getElementById(n.barId);
    if (el) {
      el.style.width = Math.min(n.value, 100) + "%";
    }
  });

  // Nav item active state toggle
  var navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(function(item) {
    item.addEventListener("click", function() {
      navItems.forEach(function(i) { i.classList.remove("active"); });
      item.classList.add("active");
    });
  });
