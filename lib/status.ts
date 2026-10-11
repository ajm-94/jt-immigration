// Case stages, in pipeline order.
export const STAGES = [
  { key: "collecting", staff: "Collecting documents", client: "Gathering documents", tone: "slate" },
  { key: "submitted", staff: "Ready for review", client: "With JT Immigration for review", tone: "blue" },
  { key: "changes_requested", staff: "Waiting on client", client: "Action needed", tone: "amber" },
  { key: "ready_to_lodge", staff: "Ready to lodge", client: "Approved — ready to lodge", tone: "emerald" },
  { key: "lodged", staff: "Lodged with ISD", client: "Lodged with the Immigration Service", tone: "navy" },
  { key: "further_info", staff: "ISD requested info", client: "Further information requested", tone: "amber" },
  { key: "approved", staff: "Approved — ceremony/fee", client: "Approved", tone: "emerald" },
  { key: "completed", staff: "Citizen (completed)", client: "Completed", tone: "emerald" },
  { key: "refused", staff: "Refused", client: "Decision received", tone: "red" },
  { key: "closed", staff: "Closed / withdrawn", client: "Closed", tone: "slate" },
] as const;

export type Stage = (typeof STAGES)[number]["key"];

export const isStage = (s: string): s is Stage => STAGES.some((x) => x.key === s);
export const stageInfo = (s: string) => STAGES.find((x) => x.key === s) ?? STAGES[0];

/** Stages where the client is still expected to edit answers. */
export const CLIENT_EDITABLE: Stage[] = ["collecting", "submitted", "changes_requested", "further_info"];
export const ACTIVE: Stage[] = ["collecting", "submitted", "changes_requested", "ready_to_lodge", "lodged", "further_info", "approved"];

export const TONE_CLASSES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-900",
  emerald: "bg-emerald-100 text-emerald-800",
  navy: "bg-navy text-white",
  red: "bg-red-100 text-red-800",
};
