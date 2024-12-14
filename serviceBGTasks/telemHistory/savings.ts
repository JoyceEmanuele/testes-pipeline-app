import sqldb from '../../srcCommon/db'
import { lastDayComplete_YMD, now_shiftedTS_s } from '../../srcCommon/helpers/dates'
import { calculateUnitAutomSavings } from '../../srcCommon/helpers/savings'

export async function compileUnitsAutomationSavings() {
  const dayStart = lastDayComplete_YMD();
  const dayNext = dayStart;
  const daysList = [dayStart];

  const unitsList = await sqldb.CLUNITS.getUnitsList2({}, { onlyWithGA: true });

  const cachedData = await sqldb.cache_unit_autom_savings.getList({
    unitIds: unitsList.map((x) => x.UNIT_ID),
    dayStart: daysList[0],
    dayEnd: daysList[daysList.length - 1],
  });

  for (const unit of unitsList) {
    const days = [...daysList];
    const unitCachedData = cachedData.filter((x) => x.unitId);
    for (const day of days) {
      const dayData = unitCachedData.find((x) => x.YMD === day);
      if (dayData) {
        days.splice(days.findIndex((day) => day === dayData.YMD), 1);
      }
    }

    if (days.length !== 0) {
      const dayTotalSaving = {} as {
        [day: string]: number,
      };
      const response = await calculateUnitAutomSavings(unit.UNIT_ID, dayStart, dayNext, days, '[SYSTEM]');
      for(const item of Object.values(response.hoursBlocked)) {
        for (const [day, { totalEst }] of Object.entries(item)) {
          if (!dayTotalSaving[day]) dayTotalSaving[day] = 0;
          dayTotalSaving[day] += totalEst;
        }
      }
  
      for(const [day, totalEstDay] of Object.entries(dayTotalSaving)) {
        await sqldb.cache_unit_autom_savings.w_insertUpdate({
          YMD: day,
          unitId: unit.UNIT_ID,
          totalEst: totalEstDay,
          datCache: now_shiftedTS_s(true),
        })
      }
    }
  }
  return { done: true };
}
