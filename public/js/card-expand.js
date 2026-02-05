console.log("card-expand loaded");

(() => {
  const MAX_HEIGHT = 520;

  function setupCard(card) {
    const body = card.querySelector(".post-body");
    const btn = card.querySelector(".post-expand-btn");
    if (!body || !btn) return;

    function apply() {
      // reset
      card.classList.remove("is-collapsed", "is-expanded");
      btn.hidden = true;
      btn.textContent = "Show more";

      // measure
      const fullHeight = body.scrollHeight;

      if (fullHeight > MAX_HEIGHT) {
        card.classList.add("is-collapsed");
        btn.hidden = false;
      }
    }

    // Toggle
    btn.addEventListener("click", () => {
      const expanded = card.classList.contains("is-expanded");
      card.classList.toggle("is-expanded", !expanded);
      card.classList.toggle("is-collapsed", expanded);
      btn.textContent = expanded ? "Show more" : "Show less";
    });

    // Initial apply
    apply();

    // Re-apply after media loads (images/videos change height after render)
    body.querySelectorAll("img").forEach(img => {
      if (!img.complete) img.addEventListener("load", apply, { once: true });
    });
    body.querySelectorAll("video").forEach(v => {
      v.addEventListener("loadedmetadata", apply, { once: true });
    });

    // Re-apply on resize (but don't collapse if user manually expanded)
    window.addEventListener("resize", () => {
      if (!card.classList.contains("is-expanded")) apply();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".post-card").forEach(setupCard);
  });
})();
