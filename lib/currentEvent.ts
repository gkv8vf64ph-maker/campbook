const CURRENT_EVENT_KEY = "campbook_current_event_id";

export function saveCurrentEventId(eventId: number) {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    CURRENT_EVENT_KEY,
    String(eventId)
  );
}

export function getCurrentEventId(): number | null {
  if (typeof window === "undefined") return null;

  const saved = localStorage.getItem(
    CURRENT_EVENT_KEY
  );

  if (!saved) return null;

  const eventId = Number(saved);

  if (Number.isNaN(eventId)) {
    return null;
  }

  return eventId;
}

export function clearCurrentEventId() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(CURRENT_EVENT_KEY);
}