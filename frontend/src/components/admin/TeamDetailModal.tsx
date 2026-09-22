"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { AdminTeam } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export function TeamDetailModal({
  teamId,
  onClose,
}: {
  teamId: string;
  onClose: () => void;
}) {
  const [team, setTeam] = useState<AdminTeam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch<{ team: AdminTeam }>(`/api/admin/teams/${teamId}`)
      .then((data) => {
        if (!cancelled) setTeam(data.team);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load team.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Team details</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        {loading && (
          <p className="mt-6 text-sm text-slate-500">Loading team details...</p>
        )}

        {error && !loading && (
          <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {team && !loading && !error && (
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Team
              </h3>
              <p className="mt-1 font-medium text-slate-900">{team.name}</p>
              <div className="mt-1">
                <StatusBadge status={team.selectionStatus} />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Leader
              </h3>
              {team.leader ? (
                <>
                  <p className="mt-1 text-slate-900">{team.leader.name}</p>
                  <p className="text-slate-500">{team.leader.email}</p>
                </>
              ) : (
                <p className="mt-1 text-slate-400">No leader on record</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Track
                </h3>
                <p className="mt-1 text-slate-900">
                  {team.track ? `${team.track.code} — ${team.track.name}` : "Not selected"}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Problem statement
                </h3>
                <p className="mt-1 text-slate-900">
                  {team.problemStatement
                    ? `${team.problemStatement.code} — ${team.problemStatement.title}`
                    : "Not selected"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <div>
                <span className="block font-semibold uppercase tracking-wide text-slate-400">
                  Created
                </span>
                {new Date(team.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="block font-semibold uppercase tracking-wide text-slate-400">
                  Updated
                </span>
                {new Date(team.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
