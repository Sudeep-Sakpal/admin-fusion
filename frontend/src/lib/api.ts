const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Thin fetch wrapper for the backend's JSON API.
 *
 * `credentials: "include"` is required on every call: authentication is a
 * server-set HTTP-only cookie (see M2), never a token this app reads,
 * stores, or forwards itself — there is deliberately no localStorage /
 * sessionStorage / Authorization header involved anywhere here.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  // Content-Type is only meaningful when there is a body. Setting it on a
  // GET would make every read a non-simple cross-origin request and force
  // an extra CORS preflight round-trip per call.
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body !== undefined && headers["Content-Type"] === undefined) {
    headers["Content-Type"] = "application/json";
  }

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Please check your connection.");
  }

  let body: ApiEnvelope<T> | undefined;
  try {
    body = await response.json();
  } catch {
    // Non-JSON response (e.g. an upstream proxy error page).
  }

  if (!response.ok || !body?.success) {
    throw new ApiError(
      response.status,
      body?.message || "Something went wrong. Please try again."
    );
  }

  return body.data as T;
}
