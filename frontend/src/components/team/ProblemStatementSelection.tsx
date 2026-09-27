"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import type { TeamProblemStatement } from "@/lib/types";

export function ProblemStatementSelection({
  onSelected,
}: {
  onSelected: () => Promise<void>;
}) {
  const { refresh } = useAuth();
  const [items, setItems] = useState<TeamProblemStatement[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // No trackId sent — the backend scopes this to the team's already
      // selected track using server-side state only.
      const data = await apiFetch<{ problemStatements: TeamProblemStatement[] }>(
        "/api/team/problem-statements"
      );
      setItems(data.problemStatements);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await refresh();
        return;
      }
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "Could not load problem statements. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSelect(problemStatementId: string) {
    if (selectingId) return;
    setSelectingId(problemStatementId);
    setSelectError(null);
    try {
      await apiFetch("/api/team/select-problem", {
        method: "POST",
        body: JSON.stringify({ problemStatementId }),
      });
      await onSelected();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          await refresh();
          return;
        }
        setSelectError(err.message);
        if (err.status === 409 || err.status === 404) {
          await load();
        }
      } else {
        setSelectError("Could not reach the server. Please check your connection and try again.");
      }
    } finally {
      setSelectingId(null);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-md">
      <h1 className="text-xl font-bold text-slate-900">Choose your problem statement</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pick the problem statement your team will build for. This cannot be changed once
        selected.
      </p>

      {loading && <p className="mt-6 text-sm text-slate-500">Loading problem statements...</p>}

      {loadError && !loading && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={load}
            className="mt-2 font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !loadError && items && (
        <div className="mt-6 space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-slate-400">
              No problem statements are available for your track yet.
            </p>
          )}
          {items.map((ps) => {
            const isSelecting = selectingId === ps.id;
            const disabled = selectingId !== null;

            return (
              <button
                key={ps.id}
                type="button"
                onClick={() => handleSelect(ps.id)}
                disabled={disabled}
                className={`w-full rounded-xl border p-4 text-left transition disabled:cursor-not-allowed ${
                  disabled && !isSelecting
                    ? "border-slate-200 opacity-50"
                    : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <span className="font-semibold text-slate-900">
                  {ps.code} — {ps.title}
                </span>
                {ps.description && <p className="mt-1 text-sm text-slate-500">{ps.description}</p>}
                {isSelecting && (
                  <p className="mt-2 text-xs font-medium text-slate-600">Selecting...</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {selectError && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{selectError}</p>
      )}
    </div>
  );
}
