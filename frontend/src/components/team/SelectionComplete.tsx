"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import type { AuthUser, Track, TeamProblemStatement } from "@/lib/types";

export function SelectionComplete({ team }: { team: NonNullable<AuthUser["team"]> }) {
  const { refresh } = useAuth();
  const [track, setTrack] = useState<Track | null>(null);
  const [problemStatement, setProblemStatement] = useState<TeamProblemStatement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Reuses the same two read endpoints as the earlier steps purely
        // to display names — the COMPLETED state itself is already known
        // from the authenticated user, so a failure here is non-critical.
        const [tracksData, psData] = await Promise.all([
          apiFetch<{ tracks: Track[] }>("/api/tracks"),
          apiFetch<{ problemStatements: TeamProblemStatement[] }>(
            "/api/team/problem-statements"
          ),
        ]);
        if (cancelled) return;
        setTrack(tracksData.tracks.find((t) => t.id === team.track) ?? null);
        setProblemStatement(
          psData.problemStatements.find((p) => p.id === team.problemStatement) ?? null
        );
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await refresh();
          return;
        }
        // Any other failure just leaves the fallback labels below.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [team.track, team.problemStatement, refresh]);

  return (
    <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-md">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-600">
        ✓
      </div>
      <h1 className="mt-4 text-xl font-bold text-slate-900">Selection complete</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your team&apos;s track and problem statement are locked in and cannot be changed.
      </p>

      <div className="mt-6 space-y-3 text-left text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Track</p>
          <p className="mt-1 font-medium text-slate-900">
            {loading ? "Loading..." : track ? `${track.code} — ${track.name}` : "Selected"}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Problem statement
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {loading
              ? "Loading..."
              : problemStatement
                ? `${problemStatement.code} — ${problemStatement.title}`
                : "Selected"}
          </p>
        </div>
      </div>
    </div>
  );
}
