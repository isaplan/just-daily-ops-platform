import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subDays, subWeeks, subMonths, subQuarters, subYears, format, isSameDay } from "date-fns";

export type PeriodType = "day" | "week" | "month" | "quarter" | "year";

export interface DateRange {
  start: Date;
  end: Date;
}

export function getPeriodRange(period: PeriodType, date: Date = new Date()): DateRange {
  switch (period) {
    case "day":
      return { start: date, end: date };
    case "week":
      return { start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) };
    case "month":
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case "quarter":
      return { start: startOfQuarter(date), end: endOfQuarter(date) };
    case "year":
      return { start: startOfYear(date), end: endOfYear(date) };
  }
}

export function getPreviousPeriod(period: PeriodType, date: Date, count: number = 1): Date {
  switch (period) {
    case "day":
      return subDays(date, count);
    case "week":
      return subWeeks(date, count);
    case "month":
      return subMonths(date, count);
    case "quarter":
      return subQuarters(date, count);
    case "year":
      return subYears(date, count);
  }
}

export function getSameDayOfWeekPrevious(date: Date, weeksBack: number = 1): Date[] {
  const results: Date[] = [];
  for (let i = 1; i <= weeksBack; i++) {
    results.push(subWeeks(date, i));
  }
  return results;
}

export function formatPeriodLabel(period: PeriodType, date: Date): string {
  switch (period) {
    case "day":
      return format(date, "MMM d, yyyy");
    case "week":
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    case "month":
      return format(date, "MMMM yyyy");
    case "quarter":
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${format(date, "yyyy")}`;
    case "year":
      return format(date, "yyyy");
  }
}

export function getComparisonDates(
  period: PeriodType,
  currentDate: Date,
  comparisonCount: number
): Date[] {
  const dates: Date[] = [];
  
  if (period === "day") {
    // For daily, get same day of week for previous weeks
    return getSameDayOfWeekPrevious(currentDate, comparisonCount);
  }
  
  // For other periods, get previous periods
  for (let i = 1; i <= comparisonCount; i++) {
    dates.push(getPreviousPeriod(period, currentDate, i));
  }
  
  return dates;
}

export function formatDateForQuery(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getSeasonFromDate(date: Date): string {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}

export function getQuarterFromDate(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

export function getQuarterDateRange(quarter: number, year: number): DateRange {
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 2;
  return {
    start: new Date(year, startMonth, 1),
    end: endOfMonth(new Date(year, endMonth, 1)),
  };
}
