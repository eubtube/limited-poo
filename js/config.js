// Project URL + publishable key are meant to be public (RLS still protects data).
export const SUPABASE_URL = "https://tigthxyapoiendrywkup.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_W_QolxFIJTpcW3ODIgsWrQ_djm8MChi";

export function siteBaseUrl() {
  const url = new URL(location.href);
  url.hash = "";
  url.search = "";
  const path = url.pathname.replace(/[^/]+$/, "");
  url.pathname = path;
  return url.href;
}

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
