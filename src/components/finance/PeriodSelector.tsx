import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PeriodType, getPeriodRange, getPreviousPeriod, formatPeriodLabel } from "@/lib/dateUtils";

interface PeriodSelectorProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  comparisonCount: number;
  onComparisonCountChange: (count: number) => void;
}

export function PeriodSelector({
  period,
  onPeriodChange,
  currentDate,
  onDateChange,
  comparisonCount,
  onComparisonCountChange,
}: PeriodSelectorProps) {
  const handlePrevious = () => {
    onDateChange(getPreviousPeriod(period, currentDate, 1));
  };

  const handleNext = () => {
    const nextDate = getPreviousPeriod(period, currentDate, -1);
    const today = new Date();
    if (nextDate <= today) {
      onDateChange(nextDate);
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Period Type Selector */}
      <Select value={period} onValueChange={(value) => onPeriodChange(value as PeriodType)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Daily</SelectItem>
          <SelectItem value="week">Weekly</SelectItem>
          <SelectItem value="month">Monthly</SelectItem>
          <SelectItem value="quarter">Quarterly</SelectItem>
          <SelectItem value="year">Yearly</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Navigation */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatPeriodLabel(period, currentDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="icon" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button variant="outline" onClick={handleToday}>
          Today
        </Button>
      </div>

      {/* Comparison Count Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Compare to:</span>
        <Select value={comparisonCount.toString()} onValueChange={(value) => onComparisonCountChange(parseInt(value))}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 1</SelectItem>
            <SelectItem value="2">Last 2</SelectItem>
            <SelectItem value="3">Last 3</SelectItem>
            <SelectItem value="4">Last 4</SelectItem>
            <SelectItem value="5">Last 5</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
