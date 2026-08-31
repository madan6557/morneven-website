import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createDefaultScheduleInput,
  type ScheduleInput,
  type ScheduleSpec,
} from "@/services/schedulerTypes";

const weekdays = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const inputClass =
  "h-10 w-full rounded-sm border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

export function ScheduleEditor({
  value,
  onChange,
  disabled = false,
  allowWeekly = true,
  className,
}: {
  value: ScheduleInput;
  onChange: (value: ScheduleInput) => void;
  disabled?: boolean;
  allowWeekly?: boolean;
  className?: string;
}) {
  const setSchedule = (schedule: ScheduleSpec) => onChange({ ...value, schedule });
  const setType = (type: ScheduleSpec["type"]) => {
    const next = createDefaultScheduleInput(type);
    onChange({ timezone: value.timezone, schedule: next.schedule });
  };

  return (
    <div className={cn("space-y-3 rounded-sm border border-border/70 bg-background/35 p-3", className)}>
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <span className="text-xs font-heading uppercase text-foreground">Schedule</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs uppercase text-muted-foreground">Type</span>
          <select
            className={inputClass}
            value={value.schedule.type}
            disabled={disabled}
            onChange={(event) => setType(event.target.value as ScheduleSpec["type"])}
          >
            <option value="once">One-time</option>
            <option value="relative">After N days</option>
            {allowWeekly && <option value="weekly">Weekly</option>}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs uppercase text-muted-foreground">Timezone</span>
          <input
            className={inputClass}
            value={value.timezone}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, timezone: event.target.value })}
            placeholder="Asia/Singapore"
          />
        </label>
      </div>

      {value.schedule.type === "once" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs uppercase text-muted-foreground">Date</span>
            <input
              type="date"
              className={inputClass}
              value={value.schedule.date}
              disabled={disabled}
              onChange={(event) => setSchedule({ ...value.schedule, date: event.target.value })}
            />
          </label>
          <TimeInput value={value.schedule.time} disabled={disabled} onChange={(time) => setSchedule({ ...value.schedule, time })} />
        </div>
      )}

      {value.schedule.type === "relative" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs uppercase text-muted-foreground">Days</span>
            <input
              type="number"
              min={1}
              max={3650}
              className={inputClass}
              value={value.schedule.days}
              disabled={disabled}
              onChange={(event) => setSchedule({
                ...value.schedule,
                days: Math.min(3650, Math.max(1, Number(event.target.value) || 1)),
                anchorAt: undefined,
              })}
            />
          </label>
          <TimeInput value={value.schedule.time} disabled={disabled} onChange={(time) => setSchedule({ ...value.schedule, time, anchorAt: undefined })} />
        </div>
      )}

      {value.schedule.type === "weekly" && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {weekdays.map((day) => {
              const selected = value.schedule.type === "weekly" && value.schedule.weekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  disabled={disabled}
                  className={cn(
                    "h-9 rounded-sm border text-xs font-heading transition-colors",
                    selected
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    if (value.schedule.type !== "weekly") return;
                    const next = selected
                      ? value.schedule.weekdays.filter((weekday) => weekday !== day.value)
                      : [...value.schedule.weekdays, day.value].sort((left, right) => left - right);
                    if (next.length) setSchedule({ ...value.schedule, weekdays: next });
                  }}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <TimeInput value={value.schedule.time} disabled={disabled} onChange={(time) => setSchedule({ ...value.schedule, time })} />
        </div>
      )}
    </div>
  );
}

function TimeInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs uppercase text-muted-foreground">Time</span>
      <input
        type="time"
        className={inputClass}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
