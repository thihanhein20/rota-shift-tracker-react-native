// src/hooks/useShifts.ts
import { useCallback, useState } from "react";
import {
  deleteShift,
  getAllShifts,
  updateShiftStatus,
} from "../services/database";
import { cancelShiftNotifications } from "../services/notification";
import { Shift } from "../types";
import { to24Hour, todayString } from "../utils/time";

export function useShifts() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getAllShifts();
    const now = new Date();

    const updated = await Promise.all(
      data.map(async (shift) => {
        const start = new Date(`${shift.date}T${to24Hour(shift.startTime)}`);
        const end = new Date(`${shift.date}T${to24Hour(shift.endTime)}`);

        if (now >= start && now < end && shift.status === "upcoming") {
          await updateShiftStatus(shift.id, "clocked-in");
          return { ...shift, status: "clocked-in" as const };
        }
        if (now >= end && shift.status !== "completed") {
          await updateShiftStatus(shift.id, "completed");
          return { ...shift, status: "completed" as const };
        }
        return shift;
      }),
    );

    setShifts(updated);
    setLoading(false);
  }, []);

  const remove = useCallback(async (id: string) => {
    await cancelShiftNotifications(id);
    await deleteShift(id);
    setShifts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0);
  const upcomingCount = shifts.filter((s) => s.status === "upcoming").length;
  const todayShift = shifts.find((s) => s.date === todayString()) ?? null;

  return {
    shifts,
    loading,
    load,
    remove,
    totalHours,
    upcomingCount,
    todayShift,
  };
}
