import type { AdminProblemStatement } from "@/lib/types";

export function ProblemStatementOverview({
  problemStatements,
}: {
  problemStatements: AdminProblemStatement[];
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Problem statements</h2>

      {problemStatements.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No problem statements yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Track</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {problemStatements.map((ps) => (
                <tr key={ps.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-medium text-slate-900">{ps.code}</td>
                  <td className="py-2 pr-4 text-slate-600">{ps.title}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {ps.track ? ps.track.code : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ps.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {ps.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
