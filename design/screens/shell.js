// Renders the shared app shell for the static screen prototypes.
// <body data-page="dashboard"> gets the app nav; <body data-shell="onboarding"> gets the onboarding header.
(() => {
  const I = {
    home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    budget: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M8 13h3M8 16h6"/>',
    tx: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    debts: '<rect x="2" y="5" width="20" height="14" rx="1"/><path d="M2 10h20M6 15h4"/>',
    reports: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  };
  const svg = (k, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
  window.llIcon = svg;
  const NAV = [
    ["dashboard", "Home", "home"], ["budget", "Budget", "budget"], ["transactions", "Transactions", "tx"],
    ["goals", "Goals & funds", "goals"], ["debts", "Debts", "debts"], ["reports", "Reports", "reports"], ["settings", "Settings", "settings"],
  ];
  const root = document.documentElement, body = document.body, page = body.dataset.page;
  const store = { get() { try { return localStorage.getItem("ll-theme"); } catch { return null; } },
                  set(v) { try { localStorage.setItem("ll-theme", v); } catch {} } };
  const saved = store.get(); if (saved) root.dataset.theme = saved;
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const sync = () => {
    root.classList.toggle("dk", isDark());
    document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
      b.innerHTML = svg(isDark() ? "sun" : "moon", 20) + `<span class="lbl">${isDark() ? "Light theme" : "Dark theme"}</span>`;
      b.setAttribute("aria-label", isDark() ? "Switch to light theme" : "Switch to dark theme");
    });
  };
  const toggle = () => { root.dataset.theme = isDark() ? "light" : "dark"; store.set(root.dataset.theme); sync(); };
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", sync);

  const main = document.querySelector("main");
  main.id = "main"; main.tabIndex = -1;
  body.insertAdjacentHTML("afterbegin", '<a class="skip" href="#main">Skip to content</a>');

  if (body.dataset.shell === "onboarding") {
    body.classList.add("ob");
    main.insertAdjacentHTML("beforebegin", `<header class="ob-top"><a class="brand" href="index.html">The Ledger Loft</a>
      <div class="row"><button class="icon-btn" type="button" data-theme-toggle></button>
      ${body.dataset.step !== "welcome" ? '<a class="btn btn-quiet" href="dashboard.html">Save and finish later</a>' : ""}</div></header>`);
  } else {
    const link = ([key, label, icon]) => `<li><a href="${key}.html"${key === page ? ' aria-current="page"' : ""}>${svg(icon)}<span class="lbl">${label}</span></a></li>`;
    const wrap = document.createElement("div"); wrap.className = "app";
    main.replaceWith(wrap);
    wrap.innerHTML = `<aside class="sidenav" aria-label="Main">
        <a class="brand" href="dashboard.html"><span class="full">The Ledger Loft<small>Planner</small></span><span class="mono">LL</span></a>
        <nav aria-label="Main"><ul>${NAV.map(link).join("")}</ul></nav>
        <div class="foot"><button class="icon-btn" type="button" data-theme-toggle></button></div>
      </aside><div class="content"></div>`;
    const content = wrap.querySelector(".content");
    content.insertAdjacentHTML("beforeend", `<header class="topbar"><a class="brand" href="dashboard.html">The Ledger Loft</a><button class="icon-btn" type="button" data-theme-toggle></button></header>`);
    content.appendChild(main);
    const tabs = NAV.slice(0, 4).map(([k, l, i]) => `<a href="${k}.html"${k === page ? ' aria-current="page"' : ""}>${svg(i)}<span>${l.split(" ")[0]}</span></a>`).join("");
    const moreActive = ["debts", "reports", "settings"].includes(page);
    content.insertAdjacentHTML("beforeend", `<nav class="tabbar" aria-label="Main">${tabs}
        <button type="button" aria-expanded="false" aria-controls="more-menu"${moreActive ? ' aria-current="page"' : ""}>${svg("more")}<span>More</span></button></nav>
      <div class="more-menu" id="more-menu" hidden>${NAV.slice(4).map(([k, l, i]) => `<a href="${k}.html"${k === page ? ' aria-current="page"' : ""}>${svg(i, 20)}${l}</a>`).join("")}</div>`);
    const mb = content.querySelector(".tabbar button"), mm = content.querySelector("#more-menu");
    mb.addEventListener("click", () => { const o = mm.hidden; mm.hidden = !o; mb.setAttribute("aria-expanded", String(o)); });
    main.insertAdjacentHTML("beforeend", `<p class="disclaimer sm muted">The Ledger Loft is a budgeting and planning tool. It does not provide financial, legal, tax or debt advice. Calculations are based on the information you enter, and projections are estimates.</p>`);
  }
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => b.addEventListener("click", toggle));
  document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = svg(el.dataset.icon, +(el.dataset.size || 22)); });
  sync();
})();
