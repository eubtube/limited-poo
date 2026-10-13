import { isConfigured, siteBaseUrl } from "./config.js";
import { amMallCop, myPup as fetchMyPup, supabase } from "./api.js";

export const authState = {
  session: null,
  pup: null,
  mallCop: false,
};

export async function bootAuth() {
  const sb = supabase();
  if (!sb || !isConfigured()) return authState;
  const { data } = await sb.auth.getSession();
  authState.session = data.session;
  sb.auth.onAuthStateChange((_event, session) => {
    authState.session = session;
  });
  if (authState.session?.user) {
    authState.pup = await fetchMyPup(authState.session.user.id);
    authState.mallCop = await amMallCop();
  }
  maybeSendToClaim();
  return authState;
}

function maybeSendToClaim() {
  const file = location.pathname.split("/").pop() || "index.html";
  if (!authState.session && file === "claim.html") {
    location.href = "login.html";
    return;
  }
  if (!authState.session) return;
  if (authState.pup && (file === "login.html" || file === "claim.html")) {
    location.href = "index.html";
    return;
  }
  if (!authState.pup && file !== "claim.html" && file !== "login.html") {
    location.href = "claim.html";
  }
}

export async function sendMagicLink(email) {
  const sb = supabase();
  if (!sb) throw new Error("stockroom is not plugged in yet");
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteBaseUrl()}index.html`,
      shouldCreateUser: true,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const sb = supabase();
  if (!sb) return;
  await sb.auth.signOut();
  authState.session = null;
  authState.pup = null;
  authState.mallCop = false;
  location.href = "index.html";
}

export function requirePup() {
  if (!isConfigured()) throw new Error("plug in Supabase first (js/config.js)");
  if (!authState.session) throw new Error("check your email locker first");
  if (!authState.pup) throw new Error("claim a pup before you woof");
  return authState.pup;
}
