(() => {
  function px(value) {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }

  // Reads the real max-height (in px) that CSS currently applies
  function getLimitPx(card, body) {
    const wasCollapsed = card.classList.contains("is-collapsed");
    const wasExpanded = card.classList.contains("is-expanded");

    // force collapsed to make CSS max-height apply, then read computed value
    card.classList.remove("is-expanded");
    card.classList.add("is-collapsed");

    const mh = getComputedStyle(body).maxHeight; // resolves calc(...) to px
    const limit = px(mh);

    // restore previous state
    card.classList.toggle("is-collapsed", wasCollapsed);
    card.classList.toggle("is-expanded", wasExpanded);

    return limit ?? 520; // fallback
  }

  function setupCard(card) {
    const body = card.querySelector(".post-body");
    const btn = card.querySelector(".post-expand-btn");
    if (!body || !btn) return;

    function apply() {
      // reset
      card.classList.remove("is-collapsed", "is-expanded");
      btn.hidden = true;
      btn.textContent = "▾";

      const limitPx = getLimitPx(card, body);
      const fullHeight = body.scrollHeight;

      // +2 avoids “button shows on almost equal” due to rounding
      if (fullHeight > limitPx + 2) {
        card.classList.add("is-collapsed");
        btn.hidden = false;
      }
    }

    btn.addEventListener("click", () => {
      const expanded = card.classList.contains("is-expanded");
      card.classList.toggle("is-expanded", !expanded);
      card.classList.toggle("is-collapsed", expanded);
      btn.textContent = expanded ? "▾" : "▴";
    });

    // initial + late layout settles (fonts, etc.)
    apply();
    setTimeout(apply, 0);
    setTimeout(apply, 200);

    // media loads change height after initial render
    body.querySelectorAll("img").forEach(img => {
      if (!img.complete) img.addEventListener("load", apply, { once: true });
    });
    body.querySelectorAll("video").forEach(v => {
      v.addEventListener("loadedmetadata", apply, { once: true });
    });

    window.addEventListener("resize", () => {
      if (!card.classList.contains("is-expanded")) apply();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".post-card").forEach(setupCard);
  });
})();
