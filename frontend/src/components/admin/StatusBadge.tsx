import type { SelectionStatus } from "@/lib/types";

const STYLES: Record<SelectionStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  TRACK_SELECTED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: SelectionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
