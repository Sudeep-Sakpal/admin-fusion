import type { AdminTrack } from "@/lib/types";

export function TrackOverview({ tracks }: { tracks: AdminTrack[] }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Track capacity</h2>

      {tracks.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No tracks have been created yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {tracks.map((track) => {
            const pct = track.capacity > 0
              ? Math.min(100, Math.round((track.currentCount / track.capacity) * 100))
              : 0;
            const full = track.remainingSlots === 0;

            return (
              <div key={track.id} className={track.isActive ? "" : "opacity-50"}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">
                    {track.code} — {track.name}
                    {!track.isActive && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        inactive
                      </span>
                    )}
                  </span>
                  <span className={full ? "font-semibold text-red-600" : "text-slate-600"}>
                    {track.currentCount} / {track.capacity}
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${full ? "bg-red-500" : "bg-slate-900"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
