"use client";

import { useAuth } from "@/context/AuthContext";
import type { AuthUser } from "@/lib/types";
import { ProblemStatementSelection } from "./ProblemStatementSelection";
import { SelectionComplete } from "./SelectionComplete";
import { TrackSelection } from "./TrackSelection";

/**
 * Dispatches on the authenticated team's selectionStatus — the backend is
 * the only source of truth for this state machine (PENDING ->
 * TRACK_SELECTED -> COMPLETED). There is no client-side state that can
 * move a team backwards: each step's "selected" callback is just
 * AuthContext.refresh(), which re-reads /api/auth/me, so the next render
 * is driven entirely by what the server currently reports — including
 * after a page refresh, since nothing here is cached in React state that
 * needs to "survive" a reload.
 */
export function TeamLeaderFlow({ user }: { user: AuthUser }) {
  const { refresh, logout } = useAuth();
  const team = user.team;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="mb-4 flex w-full max-w-lg items-center justify-between text-sm text-slate-500">
        <span>Signed in as {user.name}</span>
        <button
          type="button"
          onClick={() => logout()}
          className="font-medium text-slate-700 underline underline-offset-2"
        >
          Log out
        </button>
      </div>

      {!team && (
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-md">
          <p className="text-sm text-slate-500">
            No team is associated with your account yet. Please contact an event organizer.
          </p>
        </div>
      )}

      {team?.selectionStatus === "PENDING" && <TrackSelection onSelected={refresh} />}

      {team?.selectionStatus === "TRACK_SELECTED" && (
        <ProblemStatementSelection onSelected={refresh} />
      )}

      {team?.selectionStatus === "COMPLETED" && <SelectionComplete team={team} />}
    </main>
  );
}
