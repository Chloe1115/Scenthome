import type { PendingIntent, ScentDraft } from "@/lib/types";

const DRAFT_KEY = "scenthome:draft";
const INTENT_KEY = "scenthome:intent";

function isBrowser() {
  return typeof window !== "undefined";
}

export function saveDraftToSession(draft: ScentDraft) {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function readDraftFromSession() {
  if (!isBrowser()) {
    return null;
  }

  const value = window.sessionStorage.getItem(DRAFT_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ScentDraft;
  } catch {
    return null;
  }
}

export function clearDraftFromSession() {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(DRAFT_KEY);
}

export function setPendingIntent(intent: PendingIntent) {
  if (!isBrowser()) {
    return;
  }

  if (!intent) {
    window.sessionStorage.removeItem(INTENT_KEY);
    return;
  }

  window.sessionStorage.setItem(INTENT_KEY, intent);
}

export function getPendingIntent() {
  if (!isBrowser()) {
    return null;
  }

  return window.sessionStorage.getItem(INTENT_KEY) as PendingIntent;
}

export function clearPendingIntent() {
  if (!isBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(INTENT_KEY);
}
