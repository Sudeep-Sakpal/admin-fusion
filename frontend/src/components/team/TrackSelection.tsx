"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import type { Track } from "@/lib/types";

export function TrackSelection({ onSelected }: { onSelected: () => Promise<void> }) {
  const { refresh } = useAuth();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiFetch<{ tracks: Track[] }>("/api/tracks");
      setTracks(data.tracks);
    } catch (err) {
      // Session expired/revoked mid-flow: let the app-level guard (driven
      // by AuthContext) send the user back to login, same recovery path
      // used on the admin dashboard.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await refresh();
        return;
      }
      setLoadError(
        err instanceof ApiError ? err.message : "Could not load tracks. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  async function handleSelect(trackId: string) {
    if (selectingId) return; // ignore repeated/overlapping submissions
    setSelectingId(trackId);
    setSelectError(null);
    try {
      // Only the trackId the backend asked for — team is derived
      // server-side from the authenticated session, never sent here.
      await apiFetch("/api/team/select-track", {
        method: "POST",
        body: JSON.stringify({ trackId }),
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
          // Track became full/inactive/unknown since it was listed —
          // backend is the source of truth, so re-fetch rather than
          // guessing at the new state.
          await loadTracks();
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
      <h1 className="text-xl font-bold text-slate-900">Choose your track</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pick the track your team will compete in. This cannot be changed once selected.
      </p>

      {loading && <p className="mt-6 text-sm text-slate-500">Loading tracks...</p>}

      {loadError && !loading && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <p>{loadError}</p>
          <button
            type="button"
            onClick={loadTracks}
            className="mt-2 font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !loadError && tracks && (
        <div className="mt-6 space-y-3">
          {tracks.length === 0 && (
            <p className="text-sm text-slate-400">No tracks are available right now.</p>
          )}
          {tracks.map((track) => {
            const full = track.remainingSlots <= 0;
            const isSelecting = selectingId === track.id;
            const disabled = full || selectingId !== null;

            return (
              <button
                key={track.id}
                type="button"
                onClick={() => handleSelect(track.id)}
                disabled={disabled}
                className={`w-full rounded-xl border p-4 text-left transition disabled:cursor-not-allowed ${
                  full
                    ? "border-slate-100 bg-slate-50 opacity-60"
                    : selectingId !== null && !isSelecting
                      ? "border-slate-200 opacity-50"
                      : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">
                    {track.code} — {track.name}
                  </span>
                  <span
                    className={
                      full ? "text-sm font-semibold text-red-600" : "text-sm text-slate-500"
                    }
                  >
                    {full
                      ? "Full"
                      : `${track.remainingSlots} slot${track.remainingSlots === 1 ? "" : "s"} left`}
                  </span>
                </div>
                {track.description && (
                  <p className="mt-1 text-sm text-slate-500">{track.description}</p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {track.currentCount} / {track.capacity} teams
                </p>
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
