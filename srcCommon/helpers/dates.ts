import i18next from '../i18n';
import * as moment from 'moment';

export function next_YMD (day: string) {
  return addDays_YMD(day, 1);
}

export function addDays_YMD (day: string, numDays: number) {
  const d = new Date(`${day}Z`);
  for (let i = 0; i < numDays; i++) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().substr(0, 10);
}

export function sumDaysXAxis (x: number, index: number) {
  return x + (index * 24);
}

export function removeDays_YMD (day: string, numDays: number) {
  const d = new Date(`${day}Z`);
  for (let i = 0; i < numDays; i++) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().substr(0, 10);
}

export function getDaysList_YMD (day: string, numDays: number) {
  const d = new Date(`${day}Z`);
  const list = [];
  for (let i = 0; i < numDays; i++) {
    list.push(d.toISOString().substr(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return list;
}

export function getDaysList2_YMD (dayStart: string, dayEndInc: string) {
  const d = new Date(`${dayStart}Z`);
  const list = [];
  let c = 0;
  while(true) {
    if (c > 370) throw Error("Intervalo maior do que o permitido").HttpStatus(500);
    c++;
    const day = d.toISOString().substr(0, 10);
    if (day > dayEndInc) break;
    list.push(day);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return list;
}

export function isDayComplete_YMD (day: string) {
  const dayLimitSave = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000)).toISOString().substr(0, 10);
  // const dayLimitFuture = new Date(Date.now() - (3 * 60 * 60 * 1000) + (15 * 60 * 1000)).toISOString().substr(0, 10);
  // if (!(day <= dayLimitFuture)) {
  //   return null;
  // }
  const isDayComplete = (day < dayLimitSave);
  return isDayComplete;
}

export function lastDayComplete_YMD () {
  const lastDayComplete = new Date(Date.now() - (3 * 60 * 60 * 1000) - (15 * 60 * 1000) - (24 * 60 * 60 * 1000)).toISOString().substr(0, 10);
  return lastDayComplete;
}

export function now_shiftedTS_s (addTZ?: boolean) {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 19) + (addTZ ? '-0300' : '');
}

export function today_shiftedYMD_s () {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().substr(0, 10);
}

export function timeToSeconds (fullDate: string) {
  const hours = Number(fullDate.substring(11, 13));
  const minutes = Number(fullDate.substring(14,16));
  const seconds = Number(fullDate.substring(17, fullDate.length >= 19 ? 19 : undefined));

  return (3600 * hours) + (60 * minutes) + seconds;
}

export function hoursMinutesToSeconds (hoursMinutes: string) {
  const [hours, minutes] = hoursMinutes.split(':').map(Number);
  return (hours * 3600) + (minutes * 60);
}

export const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');

export function dateToLL(date: string) {
  const monthArr = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  const [year, month, day] = date.split("-");

  return `${day} de ${monthArr[Number(month) - 1]} de ${year}`;
}

export type DaysOfWeek = 'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun';

export const diasDaSemana = {
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
  sun: 'Domingo'
}

export const getDatesOfLastFourDaysOfWeek = () => {
  const labels : string[] = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const dates : {day: string,  dates: Date[]}[] = [];
  for(let i = 6; i >= 0; i--){
    const arrDates = [];
    for(let j = 0; j < 4; j++){
      let currentDate = new Date();
      let currDateAux = new Date();
  
      currDateAux.setDate(currDateAux.getDate() - ((currDateAux.getDay() + (i)) % 7) - 7*(j));
  
      if (currentDate.getDay() === currDateAux.getDay()){
        currentDate.setDate(currentDate.getDate() - ((currentDate.getDay() + (i)) % 7) - 7*(j+1));
        currDateAux = currentDate;
      }
      arrDates.push(currDateAux);
    }
    const currLabel = labels[6-i];
    dates.push({dates: arrDates, day: currLabel});
  }
  
  return dates;
};

export function returnActualDate(isYeserday: boolean, language?: 'pt' | 'en' | string ) {
  if (!language) language = 'pt';
  const currentDate = new Date(Date.now() - 3 * 60 * 60 * 1000);

  if (isYeserday) currentDate.setUTCDate(currentDate.getUTCDate() -1)

  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  if (language !== 'pt') {
    return ` ${i18next.t('mesesDoAno.' + months[currentDate.getUTCMonth()], { lng: language })} ${currentDate.getUTCDate()}, ${currentDate.getUTCFullYear()} 
    ${i18next.t('as', {lng: language})} ${currentDate.getUTCHours().toString().length === 1 ? 
      `0${currentDate.getUTCHours()}`: currentDate.getUTCHours()}:${currentDate.getUTCMinutes().toString().length === 1 ?
         `0${currentDate.getUTCMinutes()}`: currentDate.getUTCMinutes()}h`
  }
  return `${currentDate.getUTCDate()} de ${months[currentDate.getUTCMonth()]} de ${currentDate.getUTCFullYear()} 
  ${i18next.t('as', {lng: language})} ${currentDate.getUTCHours().toString().length === 1 ? 
      `0${currentDate.getUTCHours()}`: currentDate.getUTCHours()}:${currentDate.getUTCMinutes().toString().length === 1 ?
         `0${currentDate.getUTCMinutes()}`: currentDate.getUTCMinutes()}h`
}

export function formattedHourTelemetry(hour: number) {
  const numDays = Math.floor(hour / 24);

  const hh = Math.floor(Math.abs(hour)) - 24 * numDays;
  const min = Math.floor((Math.abs(hour) * 60) % 60);
  const ss = Math.floor((Math.abs(hour) * 60 * 60) % 60);

  return [`${String(hh).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(ss).padStart(2, '0')}`];
}

export function getListDates(reqParams: { dayStart: string, dayEnd: string}){
  const currentDate = new Date();
  const initialDate = new Date(reqParams.dayStart);
  const finalDate = new Date(reqParams.dayEnd);
  const timeDiff = Math.abs(finalDate.getTime() - initialDate.getTime());
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 
  if (diffDays > 31) throw Error('Erro quantidades de dias, escolha até 1 mês de intervalo');
  if (currentDate.getTime() < finalDate.getTime() || currentDate.getTime() < initialDate.getTime()) throw Error('Data invalida!');
  const listDates: string[] = []
  while (true) {
    if (listDates.length === 0) {
      listDates.push(initialDate.toISOString().substring(0, 10));
    }
    const date = new Date(initialDate.setDate(initialDate.getDate() + 1));
    listDates.push(date.toISOString().substring(0, 10));
    if (date.getTime() >= finalDate.getTime()) break;
  }
  return listDates;
}

export function formataDiasTrabalhadosParaPlanilhas(daysWork: string ){
  let horas = '';
  if (daysWork) {	    
    if (daysWork.includes('allow')) {	     
      if (daysWork.length > 5) {	       
        horas = daysWork.slice(6);	
      } else {	      
        horas = 'o dia todo';
      }
    }
  } else {	
    horas = 'sem informações';	
  }
  return horas;
}

export function getNumDays(datIni: string, numMonths: number) {
  const [year, month, day] = datIni.split("-").map(Number);
  const initialDate = new Date(year, month - 1, day);

  initialDate.setMonth(initialDate.getMonth() + numMonths);
  initialDate.setDate(initialDate.getDate() - 1);

  const timeInitialDate = initialDate.getTime();
  const originalDateInMilliseconds = new Date(year, month - 1, day).getTime();
  const diffInMilliseconds = timeInitialDate - originalDateInMilliseconds;
  const numDays = Math.floor(diffInMilliseconds / (24 * 60 * 60 * 1000));

  return numDays;
}

export const checkEndDateNoLaterThanYesterday = (end_date: string) => {
  const currentDate = moment().startOf('day');

  if (moment(end_date).startOf('day').isSameOrAfter(currentDate)) {
    const previousDay = currentDate.clone().subtract(1, 'days');

    return previousDay.format('YYYY-MM-DD');
  }

  return end_date
}

export const checkEndDateNoLaterThanYesterdayWater = (start_date: string, end_date: string, last_start_date: string, last_end_date: string) => {
  const currentDate = moment().startOf('day');

  if (moment(end_date).startOf('day').isSameOrAfter(currentDate)) {
    const previousDay = currentDate.clone().subtract(1, 'days');
    const differenceInDays: number = currentDate.diff(moment(start_date), 'days');
    const lastPreviousDay = moment(last_start_date).add(differenceInDays, 'days')
    const end_date_verified = previousDay.format('YYYY-MM-DD')
    const last_end_date_verified = lastPreviousDay.format('YYYY-MM-DD')

    return {endDateVerified: end_date_verified,  lastEndDateVerified: last_end_date_verified};
  }

  return {endDateVerified: end_date, lastEndDateVerified: last_end_date}
}

export const formatISODate = (date: string): string => {
  if (date.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return date;
  }

  const parts = date.split(/[-\/]/);
  
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }

  return date;
}
