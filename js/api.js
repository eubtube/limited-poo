import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from "./config.js";

let client;

export function supabase() {
  if (!isConfigured()) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

export { isConfigured };

function fail(error) {
  throw new Error(error?.message || "the mall stockroom hiccuped");
}

function one(rel) {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] : rel;
}

export async function bumpVisits() {
  const sb = supabase();
  if (!sb) return 284019;
  const { data, error } = await sb.rpc("bump_visits");
  if (error) fail(error);
  return data;
}

export async function listPups() {
  const { data, error } = await supabase()
    .from("pups")
    .select("id, name, breed, vibe, bio, emoji, color, locked, is_founder, user_id, streaks ( days, last_slip )")
    .order("created_at", { ascending: true });
  if (error) fail(error);
  return (data || []).map((p) => ({ ...p, streaks: one(p.streaks) }));
}

export async function getFounder() {
  const { data, error } = await supabase()
    .from("pups")
    .select("id, name, streaks ( days, last_slip )")
    .eq("is_founder", true)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return data;
  return { ...data, streaks: one(data.streaks) };
}

export async function myPup(userId) {
  const { data, error } = await supabase()
    .from("pups")
    .select("id, name, breed, vibe, bio, emoji, color, streaks ( days, last_slip )")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return data;
  return { ...data, streaks: one(data.streaks) };
}

export async function claimPup(fields, userId) {
  const row = {
    user_id: userId,
    name: fields.name.trim(),
    breed: fields.breed.trim(),
    vibe: fields.vibe,
    bio: fields.bio.trim(),
    emoji: fields.emoji?.trim() || "🐾",
    color: fields.color || "#ffd1ec",
    locked: false,
    is_founder: false,
  };
  const { data, error } = await supabase().from("pups").insert(row).select().single();
  if (error) fail(error);
  const { error: streakError } = await supabase().from("streaks").insert({
    pup_id: data.id,
    days: 0,
    last_slip: "",
  });
  if (streakError) fail(streakError);
  return data;
}

export async function listScores() {
  const { data, error } = await supabase()
    .from("scores")
    .select("id, event, points, note, created_at, pup_id, pups ( name )")
    .order("points", { ascending: false });
  if (error) fail(error);
  return (data || []).map((row) => ({ ...row, pups: one(row.pups) }));
}

export async function addScore({ pupId, event, points, note }) {
  const { error } = await supabase().from("scores").insert({
    pup_id: pupId,
    event,
    points,
    note: note || "logged from the mall kiosk",
  });
  if (error) fail(error);
}

export async function deleteScore(id) {
  const { error } = await supabase().from("scores").delete().eq("id", id);
  if (error) fail(error);
}

export async function listPosts(board) {
  let query = supabase()
    .from("posts")
    .select("id, board, title, body, created_at, pup_id, pups ( name )")
    .order("created_at", { ascending: false });
  if (board && board !== "all") query = query.eq("board", board);
  const { data, error } = await query;
  if (error) fail(error);
  return (data || []).map((row) => ({ ...row, pups: one(row.pups) }));
}

export async function addPost({ pupId, board, title, body }) {
  const { error } = await supabase().from("posts").insert({ pup_id: pupId, board, title, body });
  if (error) fail(error);
}

export async function deletePost(id) {
  const { error } = await supabase().from("posts").delete().eq("id", id);
  if (error) fail(error);
}

export async function updateStreak(pupId, days, lastSlip) {
  const { error } = await supabase()
    .from("streaks")
    .update({ days, last_slip: lastSlip ?? "" })
    .eq("pup_id", pupId);
  if (error) fail(error);
}

export async function amMallCop() {
  const { data, error } = await supabase().rpc("i_am_mall_cop");
  if (error) return false;
  return Boolean(data);
}
