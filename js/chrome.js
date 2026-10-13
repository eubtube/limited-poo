import { isConfigured } from "./config.js";
import { authState, signOut } from "./auth.js";

export const NAV = [
  ["Home", "index.html"],
  ["Find a Pup", "buddies.html"],
  ["Quit Crew", "quit.html"],
  ["Scoop Scores", "scores.html"],
  ["Yammer", "yammer.html"],
];

export function pageName() {
  const file = location.pathname.split("/").pop() || "index.html";
  return file === "" ? "index.html" : file;
}

function paintBannerFlowers(host) {
  const colors = ["#ff4ecb", "#a855f7", "#3b82f6", "#7cf56a", "#ff8a3d", "#38d9ff", "#ffe14a", "#ff5e7a"];
  for (let i = 0; i < 36; i += 1) {
    const s = document.createElement("span");
    s.textContent = "✿";
    const t = i / 35;
    s.style.position = "absolute";
    s.style.left = `${t * 100}%`;
    s.style.top = `${18 + Math.sin(t * Math.PI * 2) * 32}%`;
    s.style.color = colors[i % colors.length];
    s.style.fontSize = `${10 + (i % 6) * 3}px`;
    s.style.filter = "drop-shadow(0 1px 0 #fff)";
    s.style.opacity = "0.9";
    host.append(s);
  }
}

function lockerHtml() {
  if (!isConfigured()) {
    return `<span class="locker-note">stockroom unplugged — add Supabase keys in js/config.js</span>`;
  }
  if (!authState.session) {
    return `<a href="login.html">email locker / claim a pup</a>`;
  }
  if (!authState.pup) {
    return `<a href="claim.html">finish claiming your pup</a> · <button type="button" class="ghost" id="sign-out">sign out</button>`;
  }
  const badge = authState.mallCop ? " · mall cop" : "";
  return `<span>woofing as <strong>${authState.pup.name}</strong>${badge}</span>
    <button type="button" class="ghost" id="sign-out">sign out</button>`;
}

export function renderChrome() {
  const here = pageName();
  const header = document.querySelector("#site-header");
  const footer = document.querySelector("#site-footer");
  if (header) {
    header.innerHTML = `
      <div class="topbar">
        <span>LiMiTeD POO mall hours: whenever the backyard is unsupervised</span>
        <span class="locker">${lockerHtml()}</span>
      </div>
      <div class="logo-lockup">
        <div class="banner-flowers" aria-hidden="true"></div>
        <p class="logo">LiMiTeD <span class="flower">✿</span> POO</p>
        <p class="tagline">it's a poopy world!</p>
        <nav class="mall">
          ${NAV.map(
            ([label, href]) => `<a href="${href}" class="${here === href ? "active" : ""}">${label}</a>`
          ).join("")}
        </nav>
      </div>
      <p id="mall-status" class="meta"></p>
    `;
    paintBannerFlowers(header.querySelector(".banner-flowers"));
    header.querySelector("#sign-out")?.addEventListener("click", () => signOut());
  }
  if (footer) {
    footer.innerHTML = `
      <p>✿ poo-eaters webring ✿ · previous pup · next pup · always under construction</p>
      <p>Best viewed in a sparkly mall, 1024×768, with a human who packs extra bags.</p>
      <p>Visitor <span class="hit-counter" id="hits">------</span> · Snowflake Design (not really) · © 1999–forever</p>
    `;
  }
}
