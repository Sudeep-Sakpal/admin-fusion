"use client";

import { useMemo, useState } from "react";
import type { AdminTeam, SelectionStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { TeamDetailModal } from "./TeamDetailModal";

const STATUS_OPTIONS: Array<SelectionStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "TRACK_SELECTED",
  "COMPLETED",
];

export function TeamTable({ teams }: { teams: AdminTeam[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SelectionStatus | "ALL">("ALL");
  const [trackFilter, setTrackFilter] = useState<string>("ALL");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const trackOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const team of teams) {
      if (team.track) seen.set(team.track.id, `${team.track.code} — ${team.track.name}`);
    }
    return Array.from(seen.entries());
  }, [teams]);

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLowerCase();
    return teams.filter((team) => {
      if (statusFilter !== "ALL" && team.selectionStatus !== statusFilter) return false;
      if (trackFilter !== "ALL" && team.track?.id !== trackFilter) return false;
      if (!query) return true;
      return (
        team.name.toLowerCase().includes(query) ||
        team.leader?.name.toLowerCase().includes(query) ||
        team.leader?.email.toLowerCase().includes(query)
      );
    });
  }, [teams, search, statusFilter, trackFilter]);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Teams</h2>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search team or leader..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SelectionStatus | "ALL")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "All statuses" : status.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="ALL">All tracks</option>
            {trackOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-4">Team</th>
              <th className="py-2 pr-4">Leader</th>
              <th className="py-2 pr-4">Track</th>
              <th className="py-2 pr-4">Problem statement</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeams.map((team) => (
              <tr
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="py-2 pr-4 font-medium text-slate-900">{team.name}</td>
                <td className="py-2 pr-4 text-slate-600">
                  {team.leader ? (
                    <>
                      <div>{team.leader.name}</div>
                      <div className="text-xs text-slate-400">{team.leader.email}</div>
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-slate-600">
                  {team.track ? team.track.code : <span className="text-slate-400">—</span>}
                </td>
                <td className="py-2 pr-4 text-slate-600">
                  {team.problemStatement ? (
                    team.problemStatement.code
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge status={team.selectionStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTeams.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            No teams match the current filters.
          </p>
        )}
      </div>

      {selectedTeamId && (
        <TeamDetailModal teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
      )}
    </div>
  );
}
