import { format, startOfWeek, differenceInWeeks, addDays, isBefore, differenceInHours } from "date-fns";

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "yyyy-MM-dd");
}

export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "yyyy-MM-dd HH:mm");
}

export function getCurrentWeekStart(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 0 }); // Sunday start
}

export function getWeeksDifference(from: Date, to: Date): number {
  return Math.abs(differenceInWeeks(to, from));
}

export function isCurrentWeek(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const currentWeekStart = getCurrentWeekStart();
  const dateWeekStart = startOfWeek(dateObj, { weekStartsOn: 0 });
  return currentWeekStart.getTime() === dateWeekStart.getTime();
}

export function isFutureWeek(date: Date | string): boolean {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const currentWeekStart = getCurrentWeekStart();
  const dateWeekStart = startOfWeek(dateObj, { weekStartsOn: 0 });
  return dateWeekStart > currentWeekStart;
}

export function getTodayString(): string {
  return formatDate(new Date());
}

export function isLateCancellation(reservationDate: string): boolean {
  const resDate = new Date(reservationDate);
  const now = new Date();
  return differenceInHours(resDate, now) < 12;
}

export function getMinDate(): string {
  return getTodayString();
}
