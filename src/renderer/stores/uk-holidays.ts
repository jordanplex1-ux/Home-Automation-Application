import { getYear, addDays, nextMonday, previousMonday, isMonday } from 'date-fns'

interface Holiday {
  name: string
  date: string // YYYY-MM-DD
}

function easterSunday(year: number): Date {
  // Anonymous Gregorian algorithm
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function substituteIfWeekend(date: Date): Date {
  const dow = date.getDay()
  if (dow === 0) return addDays(date, 1) // Sunday -> Monday
  if (dow === 6) return addDays(date, 2) // Saturday -> Monday
  return date
}

function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getUKBankHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = []

  // New Year's Day (1 Jan, substituted if weekend)
  holidays.push({
    name: "New Year's Day",
    date: fmt(substituteIfWeekend(new Date(year, 0, 1)))
  })

  // Good Friday (2 days before Easter)
  const easter = easterSunday(year)
  holidays.push({
    name: 'Good Friday',
    date: fmt(addDays(easter, -2))
  })

  // Easter Monday
  holidays.push({
    name: 'Easter Monday',
    date: fmt(addDays(easter, 1))
  })

  // Early May Bank Holiday (first Monday in May)
  const may1 = new Date(year, 4, 1)
  const earlyMay = isMonday(may1) ? may1 : nextMonday(may1)
  holidays.push({
    name: 'Early May Bank Holiday',
    date: fmt(earlyMay)
  })

  // Spring Bank Holiday (last Monday in May)
  const may31 = new Date(year, 4, 31)
  const springBank = isMonday(may31) ? may31 : previousMonday(may31)
  holidays.push({
    name: 'Spring Bank Holiday',
    date: fmt(springBank)
  })

  // Summer Bank Holiday (last Monday in August)
  const aug31 = new Date(year, 7, 31)
  const summerBank = isMonday(aug31) ? aug31 : previousMonday(aug31)
  holidays.push({
    name: 'Summer Bank Holiday',
    date: fmt(summerBank)
  })

  // Christmas Day (25 Dec, substituted if weekend)
  holidays.push({
    name: 'Christmas Day',
    date: fmt(substituteIfWeekend(new Date(year, 11, 25)))
  })

  // Boxing Day (26 Dec, substituted if weekend — but also can't clash with Christmas substitute)
  const boxingRaw = new Date(year, 11, 26)
  let boxing = substituteIfWeekend(boxingRaw)
  const christmasSubstituted = substituteIfWeekend(new Date(year, 11, 25))
  if (fmt(boxing) === fmt(christmasSubstituted)) {
    boxing = addDays(boxing, 1)
  }
  holidays.push({
    name: 'Boxing Day',
    date: fmt(boxing)
  })

  return holidays
}

export function getUKMajorHolidays(year: number): Holiday[] {
  // Non-bank holidays that are culturally significant
  return [
    { name: "Valentine's Day", date: `${year}-02-14` },
    { name: "St Patrick's Day", date: `${year}-03-17` },
    { name: "St George's Day", date: `${year}-04-23` },
    { name: 'Halloween', date: `${year}-10-31` },
    { name: 'Bonfire Night', date: `${year}-11-05` },
    { name: "St Andrew's Day", date: `${year}-11-30` },
    { name: 'Christmas Eve', date: `${year}-12-24` },
    { name: "New Year's Eve", date: `${year}-12-31` },
  ]
}
