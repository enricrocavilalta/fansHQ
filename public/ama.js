// /public/js/ama.js
(() => {
  // Bind the AMA form exactly once per page load, even if this script runs again.
  function wireAMA() {
    const form = document.getElementById("ama-form");
    if (!form || form.__wired) return;      // ← idempotent guard
    form.__wired = true;

    const box   = document.getElementById("ama");
    const postId= box?.dataset.postId;
    const qEl   = document.getElementById("q");
    const email = document.getElementById("email");
    const tip   = document.getElementById("tip");
    const err   = document.getElementById("err");
    const list  = document.getElementById("list");

    const fmtMoney = (n) => "€" + Number(n).toFixed(2);
    const addRow = (row) => {
      const li = document.createElement("li");
      const meta = document.createElement("div");
      meta.style.opacity = ".7";
      meta.style.fontSize = ".8rem";
      meta.textContent = (row.email || "Anonymous") + " • " +
                         new Date(row.created_at || Date.now()).toLocaleString();
      li.appendChild(meta);
      if (row.question) { const p = document.createElement("p"); p.textContent = row.question; li.appendChild(p); }
      if (Number(row.tip) > 0) { const s = document.createElement("small"); s.textContent = "Tip: " + fmtMoney(row.tip); li.appendChild(s); }
      list.insertBefore(li, list.firstChild);
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // prevent double-click / Enter spam
      if (form.dataset.busy === "1") return;
      form.dataset.busy = "1";
      err.style.display = "none";

      try {
        const payload = {
          question: qEl.value.trim() || null,
          email: email.value.trim() || null,
          tip: tip.value ? Number(tip.value) : 0
        };

        const res = await fetch(`/api/posts/${postId}/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Server error");
        const saved = await res.json();

        addRow(saved);
        qEl.value = "";
        tip.value = "";
      } catch (e2) {
        err.textContent = "Couldn’t send. Try again.";
        err.style.display = "block";
      } finally {
        form.dataset.busy = "0";
      }
    });
  }

  // Run on initial load, and also after common partial/DOM swaps.
  document.addEventListener("DOMContentLoaded", wireAMA);
  document.addEventListener("turbo:load", wireAMA);        // Turbo / Hotwire (if present)
  document.addEventListener("htmx:afterSettle", wireAMA);  // htmx (if present)
})();
