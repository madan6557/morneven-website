import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScheduleEditor } from "@/components/ScheduleEditor";
import {
  scheduleInputFromTask,
  type ScheduleInput,
  type ScheduledTask,
} from "@/services/schedulerTypes";

describe("schedule controls", () => {
  it("keeps at least one weekday selected", () => {
    const value: ScheduleInput = {
      timezone: "Asia/Singapore",
      schedule: { type: "weekly", weekdays: [0], time: "02:00" },
    };
    const onChange = vi.fn();
    render(<ScheduleEditor value={value} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Sun" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("preserves the timezone when changing schedule type", () => {
    const value: ScheduleInput = {
      timezone: "Asia/Makassar",
      schedule: { type: "weekly", weekdays: [1], time: "09:00" },
    };
    const onChange = vi.fn();
    render(<ScheduleEditor value={value} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "relative" } });
    expect(onChange).toHaveBeenCalledWith({
      timezone: "Asia/Makassar",
      schedule: { type: "relative", days: 1, time: "02:00" },
    });
  });

  it("hydrates the persisted timezone and schedule", () => {
    const task = {
      timezone: "Asia/Jayapura",
      schedule: { type: "once", date: "2026-08-01", time: "04:30" },
    } as ScheduledTask;
    expect(scheduleInputFromTask(task)).toEqual({
      timezone: "Asia/Jayapura",
      schedule: { type: "once", date: "2026-08-01", time: "04:30" },
    });
  });
});
