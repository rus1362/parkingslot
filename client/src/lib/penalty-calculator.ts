import { differenceInWeeks, startOfWeek } from "date-fns";
import { getCurrentWeekStart } from "./date-utils";

export interface PenaltyCalculation {
  points: number;
  reason: string;
  type: "future_week" | "late_cancellation" | "none";
}

export function calculateReservationPenalty(
  reservationDate: string,
  weeklyMultiplier: number = 1
): PenaltyCalculation {
  const resDate = new Date(reservationDate);
  const currentWeekStart = getCurrentWeekStart();
  const reservationWeekStart = startOfWeek(resDate, { weekStartsOn: 0 });

  if (reservationWeekStart <= currentWeekStart) {
    return {
      points: 0,
      reason: "No penalty for current week",
      type: "none"
    };
  }

  const weeksDiff = Math.abs(differenceInWeeks(reservationWeekStart, currentWeekStart));
  const points = weeksDiff * weeklyMultiplier;

  return {
    points,
    reason: `${weeksDiff} week${weeksDiff > 1 ? 's' : ''} in advance`,
    type: "future_week"
  };
}

export function calculateCancellationPenalty(
  reservationDate: string,
  lateCancelMultiplier: number = 1
): PenaltyCalculation {
  const resDate = new Date(reservationDate);
  const now = new Date();
  const hoursUntil = (resDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil >= 12) {
    return {
      points: 0,
      reason: "No penalty for early cancellation",
      type: "none"
    };
  }

  return {
    points: lateCancelMultiplier,
    reason: "Cancelled less than 12 hours before reservation",
    type: "late_cancellation"
  };
}
