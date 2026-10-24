declare global {
  interface Window {
    __API_BASE__: string;
  }
}
const params = new URLSearchParams(location.hash.slice(1));
let token = params.get("workspace");
if (
  !token ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    token,
  )
) {
  token = crypto.randomUUID();
  params.set("workspace", token);
  history.replaceState(
    null,
    "",
    `${location.pathname}${location.search}#${params}`,
  );
}
const raw = window.__API_BASE__ || "";
const unresolved = raw.startsWith("__PORT_");
const local = new Set(["localhost", "127.0.0.1", "[::1]"]).has(
  location.hostname,
);
const base = unresolved && local ? "http://127.0.0.1:8787" : raw;
export async function apiRequest<T>(
  path: string,
  payload?: unknown,
): Promise<T> {
  if (unresolved && !local)
    throw new Error(
      "The preview backend was not connected. Reopen the canonical app preview.",
    );
  const response = await fetch(`${base}${path}`, {
    method: payload ? "POST" : "GET",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Workspace-Token": token!,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const responseText = await response.text();
  let result: { error?: string };
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      "The service returned an unreadable response. Retry the same update; completed request IDs are replay-protected.",
    );
  }
  if (!response.ok)
    throw new Error(
      result.error || "The service could not complete this request.",
    );
  return result as T;
}
