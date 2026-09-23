"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, refresh, logout } = useAuth();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ userId, password }),
      });
      await refresh();
      if (data.user.role === "ADMIN") {
        router.push("/admin");
      }
      // TEAM_LEADER stays on "/": the render below now shows the
      // authenticated view instead of the form once `user` is populated,
      // so no navigation is needed (there is no separate route for it yet).
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Covers direct/refreshed visits to "/" while already authenticated as
  // ADMIN (e.g. a bookmark or browser back), not just the post-login case
  // above.
  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Checking your session...</p>
      </main>
    );
  }

  if (user) {
    // ADMIN is redirected by the effect above; this renders for
    // TEAM_LEADER (and briefly for ADMIN until that redirect runs).
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-md">
          <h1 className="text-2xl font-bold text-slate-900">
            Hackathon Management System
          </h1>
          <p className="mt-2 text-sm text-slate-500">Signed in as {user.name}</p>
          {user.team && (
            <p className="mt-1 text-sm text-slate-500">
              Team: {user.team.name} — {user.team.selectionStatus.replace("_", " ")}
            </p>
          )}
          <button
            onClick={() => logout()}
            className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Log out
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-slate-900">
          Hackathon Management System
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Sign in to continue
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="userId"
              className="block text-sm font-medium text-slate-700"
            >
              User ID
            </label>
            <input
              id="userId"
              type="text"
              autoComplete="username"
              placeholder="e.g. TL001"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Log In"}
          </button>
        </form>
      </div>
    </main>
  );
}
