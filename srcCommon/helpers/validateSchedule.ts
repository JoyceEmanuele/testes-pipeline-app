type SelectedDays = {
  mon?: boolean;
  tue?: boolean;
  wed?: boolean;
  thu?: boolean;
  fri?: boolean;
  sat?: boolean;
  sun?: boolean;
}

type Interval = {
  startTime: string;
  endTime: string
}

export function checkWeekDayCommon(days1: SelectedDays, days2: SelectedDays): boolean {
  let result = days1.mon && days2.mon;
  result = result || (days1.tue && days2.tue);
  result = result || (days1.wed && days2.wed);
  result = result || (days1.thu && days2.thu);
  result = result || (days1.fri && days2.fri);
  result = result || (days1.sat && days2.sat);
  result = result || (days1.sun && days2.sun);

  return !!result;
}

export function checkTimeConflict(intervalToCompare: Interval, interval: Interval): boolean {
  return (intervalToCompare.startTime <= interval.startTime && interval.startTime <= intervalToCompare.endTime)
    || (interval.startTime <= intervalToCompare.startTime && intervalToCompare.startTime <= interval.endTime)
    || (intervalToCompare.startTime <= interval.startTime && interval.endTime <= intervalToCompare.endTime)
    || (interval.startTime <= intervalToCompare.startTime && intervalToCompare.endTime <= interval.endTime);
}