export type ScheduleSpec =
  | { type: "once"; date: string; time: string }
  | { type: "relative"; days: number; time: string; anchorAt?: string }
  | { type: "weekly"; weekdays: number[]; time: string };

export interface ScheduleInput {
  timezone: string;
  schedule: ScheduleSpec;
}

export interface ScheduledTask {
  id: string;
  key: string;
  kind: string;
  targetId?: string | null;
  enabled: boolean;
  timezone: string;
  schedule: ScheduleSpec;
  payload: Record<string, unknown>;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  lastStatus?: string | null;
  lastError?: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Singapore";
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createDefaultScheduleInput(type: ScheduleSpec["type"] = "weekly"): ScheduleInput {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const timezone = browserTimezone();
  if (type === "once") {
    return { timezone, schedule: { type, date: localDateString(tomorrow), time: "02:00" } };
  }
  if (type === "relative") {
    return { timezone, schedule: { type, days: 1, time: "02:00" } };
  }
  return { timezone, schedule: { type, weekdays: [0], time: "02:00" } };
}

export function scheduleInputFromTask(task: ScheduledTask | null | undefined): ScheduleInput {
  if (!task) return createDefaultScheduleInput();
  return {
    timezone: task.timezone || browserTimezone(),
    schedule: task.schedule,
  };
}
