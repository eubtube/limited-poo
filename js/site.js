import {
  addPost,
  addScore,
  bumpVisits,
  claimPup,
  deletePost,
  deleteScore,
  getFounder,
  isConfigured,
  listPosts,
  listPups,
  listScores,
  updateStreak,
} from "./api.js";
import { authState, bootAuth, requirePup, sendMagicLink } from "./auth.js";
import { renderChrome } from "./chrome.js";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function labelFor(vibe) {
  if (vibe === "quit") return "Quit Crew";
  if (vibe === "compete") return "Still competing";
  return "Yammer pal";
}

function canDelete(rowPupId) {
  if (authState.mallCop) return true;
  return Boolean(authState.pup && authState.pup.id === rowPupId);
}

function say(message, isError = false) {
  const el = document.querySelector("#mall-status");
  if (el) {
    el.textContent = message;
    el.classList.toggle("error", isError);
  } else if (message) {
    console.warn(message);
  }
}

function sparkles() {
  const field = document.querySelector(".sparkle-field");
  if (!field) return;
  const glyphs = ["✿", "★", "♥", "✦", "❀"];
  for (let i = 0; i < 18; i += 1) {
    const span = document.createElement("span");
    span.className = "sparkle";
    span.textContent = glyphs[i % glyphs.length];
    span.style.left = `${Math.random() * 100}%`;
    span.style.top = `${Math.random() * 100}%`;
    span.style.animationDelay = `${Math.random() * 5}s`;
    span.style.color = ["#ff4fb0", "#c77dff", "#3ee7ff", "#b8ff3c", "#ff9f1c"][i % 5];
    field.appendChild(span);
  }
}

function flowerCursor() {
  let last = 0;
  document.addEventListener("mousemove", (e) => {
    const now = Date.now();
    if (now - last < 45) return;
    last = now;
    const t = document.createElement("div");
    t.className = "flower-trail";
    t.textContent = "✿";
    t.style.left = `${e.clientX}px`;
    t.style.top = `${e.clientY}px`;
    t.style.color = ["#ff2ea6", "#38d9ff", "#c4ff4d", "#a855f7"][Math.floor(Math.random() * 4)];
    document.body.append(t);
    setTimeout(() => t.remove(), 800);
  });
}

function gateForms() {
  document.querySelectorAll("[data-needs-pup]").forEach((section) => {
    if (authState.pup) return;
    const note = document.createElement("p");
    note.className = "meta";
    note.innerHTML = authState.session
      ? `Claim your pup in the <a href="claim.html">fitting room</a> before you post.`
      : `This locker is for claimed pups. <a href="login.html">Get a magic link</a> first.`;
    section.querySelectorAll("form, button, input, select, textarea").forEach((el) => {
      if (el.id === "slip-note") return;
    });
    const form = section.querySelector("form") || section;
    form.querySelectorAll("input, select, textarea, button").forEach((el) => {
      if (el.classList.contains("keep-open")) return;
      el.disabled = true;
    });
    section.prepend(note);
  });
}

async function renderHome() {
  const cap = document.querySelector("#cover-caption");
  if (!cap || !isConfigured()) return;
  try {
    const millie = await getFounder();
    const days = millie?.streaks?.days ?? 4;
    cap.textContent = `${millie?.name || "Millie"} · Cover Girl · Day ${days} of Leave It`;
  } catch (err) {
    say(err.message, true);
  }
}

async function renderPups(filter = "all") {
  const root = document.querySelector("#pup-list");
  if (!root) return;
  const pups = await listPups();
  const shown = filter === "all" ? pups : pups.filter((p) => p.vibe === filter);
  root.innerHTML = shown
    .map((p) => {
      const days = p.streaks?.days;
      const extra =
        p.vibe === "quit" && days != null ? ` · ${days} days Leave It` : p.is_founder ? " · founder" : "";
      return `
      <article class="pup-card">
        <div class="avatar" style="background:${esc(p.color)}">${esc(p.emoji)}</div>
        <h3>${esc(p.name)}</h3>
        <p class="meta">${esc(p.breed)}${esc(extra)}</p>
        <p><span class="badge ${esc(p.vibe)}">${labelFor(p.vibe)}</span></p>
        <p>${esc(p.bio)}</p>
      </article>`;
    })
    .join("");
}

async function renderScores() {
  const root = document.querySelector("#score-body");
  if (!root) return;
  const rows = await listScores();
  root.innerHTML = rows
    .map((s, i) => {
      const del = canDelete(s.pup_id)
        ? `<button type="button" class="ghost" data-del-score="${s.id}">un-log</button>`
        : "";
      return `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(s.pups?.name)}</td>
        <td>${esc(s.event)}</td>
        <td><strong>${esc(s.points)}</strong></td>
        <td>${esc(s.note)} ${del}</td>
      </tr>`;
    })
    .join("");
}

async function renderPosts(board) {
  const root = document.querySelector("#yammer-feed");
  if (!root) return;
  const posts = await listPosts(board);
  root.innerHTML = posts
    .map((p) => {
      const del = canDelete(p.pup_id)
        ? `<button type="button" class="ghost" data-del-post="${p.id}">take down</button>`
        : "";
      return `
      <article class="yammer-post">
        <h3>${esc(p.title)}</h3>
        <p class="meta">woofed by ${esc(p.pups?.name)} · board: ${esc(p.board)} ${del}</p>
        <p>${esc(p.body)}</p>
      </article>`;
    })
    .join("");
}

async function renderStreak() {
  const el = document.querySelector("#streak-days");
  if (!el) return;
  const mine = authState.pup;
  const note = document.querySelector("#streak-note");
  if (mine) {
    const days = mine.streaks?.days ?? 0;
    el.textContent = days;
    if (note) {
      note.textContent = `${mine.name} is on a ${days}-day Leave It streak.${
        mine.streaks?.last_slip ? ` Last slip: ${mine.streaks.last_slip}` : ""
      }`;
    }
    return;
  }
  if (!isConfigured()) {
    el.textContent = "4";
    if (note) note.textContent = "Millie is on a 4-day Leave It streak (local preview).";
    return;
  }
  const millie = await getFounder();
  el.textContent = millie?.streaks?.days ?? 0;
  if (note) {
    note.textContent = `${millie?.name || "Millie"}'s public streak. Claim a pup to track your own.`;
  }
}

function leaveItGame() {
  const arena = document.querySelector("#leave-it");
  if (!arena) return;
  const scoreEl = document.querySelector("#game-score");
  let score = 0;
  const spawn = () => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "item keep-open";
    const good = Math.random() > 0.45;
    item.textContent = good ? "🦴" : "💩";
    item.style.left = `${10 + Math.random() * 80}%`;
    item.style.top = `${15 + Math.random() * 65}%`;
    item.addEventListener("click", () => {
      score += good ? 10 : -15;
      if (scoreEl) scoreEl.textContent = String(score);
      item.remove();
    });
    arena.appendChild(item);
    setTimeout(() => item.remove(), 1600);
  };
  setInterval(spawn, 700);
}

function bindForms() {
  document.querySelector("#login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = new FormData(e.target).get("email");
    try {
      await sendMagicLink(String(email));
      say(`Magic link packed. Check ${email} — even the junk folder, like a backyard.`);
    } catch (err) {
      say(err.message, true);
    }
  });

  document.querySelector("#claim-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      if (!authState.session) throw new Error("check your email locker first");
      await claimPup(data, authState.session.user.id);
      location.href = "buddies.html";
    } catch (err) {
      say(err.message, true);
    }
  });

  document.querySelector("#pup-filter")?.addEventListener("change", (e) => {
    renderPups(e.target.value).catch((err) => say(err.message, true));
  });

  document.querySelector("#score-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const pup = requirePup();
      const data = Object.fromEntries(new FormData(e.target));
      const points =
        Number(data.audacity || 1) * 80 +
        Number(data.freshness || 1) * 40 +
        (data.witnesses === "yes" ? 200 : 0);
      await addScore({ pupId: pup.id, event: data.event, points, note: data.note });
      e.target.reset();
      await renderScores();
      say("judges have received the tape");
    } catch (err) {
      say(err.message, true);
    }
  });

  document.querySelector("#post-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const pup = requirePup();
      const data = Object.fromEntries(new FormData(e.target));
      await addPost({ pupId: pup.id, board: data.board, title: data.title, body: data.body });
      e.target.reset();
      await renderPosts(document.querySelector("#board-filter")?.value || "all");
      say("woof posted on the hot-pink bench");
    } catch (err) {
      say(err.message, true);
    }
  });

  document.querySelector("#board-filter")?.addEventListener("change", (e) => {
    renderPosts(e.target.value).catch((err) => say(err.message, true));
  });

  document.querySelector("#streak-up")?.addEventListener("click", async () => {
    try {
      const pup = requirePup();
      const days = (pup.streaks?.days ?? 0) + 1;
      await updateStreak(pup.id, days, pup.streaks?.last_slip || "");
      pup.streaks = { ...(pup.streaks || {}), days };
      await renderStreak();
    } catch (err) {
      say(err.message, true);
    }
  });

  document.querySelector("#streak-reset")?.addEventListener("click", async () => {
    try {
      const pup = requirePup();
      const lastSlip = document.querySelector("#slip-note")?.value || "the snack won today";
      await updateStreak(pup.id, 0, lastSlip);
      pup.streaks = { days: 0, last_slip: lastSlip };
      await renderStreak();
    } catch (err) {
      say(err.message, true);
    }
  });

  document.querySelector("#score-body")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-score]");
    if (!btn) return;
    try {
      await deleteScore(btn.dataset.delScore);
      await renderScores();
    } catch (err) {
      say(err.message, true);
    }
  });

  document.querySelector("#yammer-feed")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-del-post]");
    if (!btn) return;
    try {
      await deletePost(btn.dataset.delPost);
      await renderPosts(document.querySelector("#board-filter")?.value || "all");
    } catch (err) {
      say(err.message, true);
    }
  });
}

async function boot() {
  sparkles();
  flowerCursor();
  renderChrome();
  try {
    await bootAuth();
    renderChrome();
  } catch (err) {
    say(err.message, true);
  }
  if (!isConfigured()) {
    say("Preview mode: plug Supabase into js/config.js to open the shared mall.", true);
  }
  try {
    const hits = document.querySelector("#hits");
    if (hits) hits.textContent = String(await bumpVisits()).padStart(6, "0");
  } catch {
    const hits = document.querySelector("#hits");
    if (hits) hits.textContent = "000000";
  }
  gateForms();
  bindForms();
  leaveItGame();
  try {
    await renderHome();
    if (isConfigured()) {
      await renderPups();
      await renderScores();
      await renderPosts("all");
    }
    await renderStreak();
  } catch (err) {
    say(err.message, true);
  }
}

boot();
