"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import type {
  AdminDashboard,
  AdminProblemStatement,
  AdminTeam,
  AdminTrack,
} from "@/lib/types";
import { ProblemStatementOverview } from "@/components/admin/ProblemStatementOverview";
import { TeamTable } from "@/components/admin/TeamTable";
import { TrackOverview } from "@/components/admin/TrackOverview";

interface AdminData {
  dashboard: AdminDashboard;
  teams: AdminTeam[];
  tracks: AdminTrack[];
  problemStatements: AdminProblemStatement[];
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();

  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setError(null);
    try {
      const [dashboard, teamsRes, tracksRes, psRes] = await Promise.all([
        apiFetch<AdminDashboard>("/api/admin/dashboard"),
        apiFetch<{ teams: AdminTeam[] }>("/api/admin/teams"),
        apiFetch<{ tracks: AdminTrack[] }>("/api/admin/tracks"),
        apiFetch<{ problemStatements: AdminProblemStatement[] }>(
          "/api/admin/problem-statements"
        ),
      ]);
      setData({
        dashboard,
        teams: teamsRes.teams,
        tracks: tracksRes.tracks,
        problemStatements: psRes.problemStatements,
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not load admin data. Please try again."
      );
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") {
      loadData();
    }
  }, [authLoading, user, loadData]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Checking your session...</p>
      </main>
    );
  }

  if (!user) {
    // Redirect effect above will kick in; render nothing meanwhile.
    return null;
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Access denied</h1>
        <p className="max-w-sm text-sm text-slate-500">
          This area is only available to event administrators. Your account
          does not have the required permissions.
        </p>
        <a
          href="/"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Back to home
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>
            <p className="text-sm text-slate-500">Signed in as {user.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadData}
              disabled={dataLoading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {dataLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={async () => {
                await logout();
                router.push("/");
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Log out
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {dataLoading && !data && (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading admin data...
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard label="Total teams" value={data.dashboard.teams.total} />
              <StatCard label="Pending" value={data.dashboard.teams.pending} />
              <StatCard label="Track selected" value={data.dashboard.teams.trackSelected} />
              <StatCard label="Completed" value={data.dashboard.teams.completed} />
              <StatCard label="Active tracks" value={data.dashboard.tracks.totalActive} />
              <StatCard
                label="Active problem statements"
                value={data.dashboard.problemStatements.totalActive}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <TrackOverview tracks={data.tracks} />
              <ProblemStatementOverview problemStatements={data.problemStatements} />
            </div>

            <TeamTable teams={data.teams} />
          </>
        )}
      </div>
    </main>
  );
}
