import { differenceInWeeks, startOfWeek } from "date-fns";
import { getCurrentWeekStart } from "./date-utils";

export interface PenaltyCalculation {
  points: number;
  reason: string;
  type: "future_week" | "late_cancellation" | "none" | "future_day";
}

export function calculateReservationPenalty(
  reservationDate: string,
  weeklyMultiplier: number = 1
): PenaltyCalculation {
  const resDate = new Date(reservationDate);
  const now = new Date();
  const daysDiff = Math.ceil(
    (resDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff <= 10) {
    return {
      points: 0,
      reason: "No penalty for reservations made within the first 10 days",
      type: "none"
    };
  }

  const penaltyPeriods = Math.ceil(daysDiff / 10) - 1; // Calculate the number of 10-day periods beyond the first penalty-free period
  const points = penaltyPeriods * weeklyMultiplier;
  return {
    points,
    reason: `${penaltyPeriods} penalty period${penaltyPeriods > 1 ? 's' : ''} in advance`,
    type: "future_day"
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
