// Public anon key is safe to ship with Row Level Security on.
// Fill these in after you create the Supabase project (see supabase/schema.sql).
export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

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
