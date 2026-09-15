export function trackNav(payload: {
  linkId: string;
  viewId?: string;
  dataroomId: string;
  documentId?: string;
  folderId?: string;
  eventType: string;
  query?: string;
  listId?: string;
}): void {
  try {
    fetch("/api/links/nav-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}
