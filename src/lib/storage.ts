import type { AppDatabase } from "@/lib/types";

const APP_STATE_KEY = "robot-web-prototype::app-state";
const DRAFT_STATE_KEY = "robot-web-prototype::draft-state";

function isBrowser() {
  return typeof window !== "undefined";
}

export function readAppState() {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(APP_STATE_KEY);
  return raw ? (JSON.parse(raw) as AppDatabase) : null;
}

export function writeAppState(value: AppDatabase) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(APP_STATE_KEY, JSON.stringify(value));
}

export function readDraft<T>(key: string) {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(`${DRAFT_STATE_KEY}:${key}`);
  return raw ? (JSON.parse(raw) as T) : null;
}

export function writeDraft<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(`${DRAFT_STATE_KEY}:${key}`, JSON.stringify(value));
}

export function clearDraft(key: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(`${DRAFT_STATE_KEY}:${key}`);
}
