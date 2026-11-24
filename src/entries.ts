import type { Frequency } from './stocks.ts'

// What the user enters over time (R-1, R-4): an indicator's value for a period and a stock's price on a date.

export interface IndicatorValue {
  id: string
  indicatorId: string
  // 'YYYY-MM' for a monthly indicator, 'YYYY-Qn' for a quarterly one.
  period: string
  value: number
  sourceUrl?: string
  note?: string
}

export interface Price {
  id: string
  stockId: string
  // 'YYYY-MM-DD'
  date: string
  price: number
}

export interface ValueDraft {
  period: string
  value: string
  sourceUrl: string
  note: string
}

export interface PriceDraft {
  date: string
  price: string
}

// Today in the user's time zone, as 'YYYY-MM-DD'.
export function todayISO(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/
const QUARTER = /^(\d{4})-Q([1-4])$/

export function isValidPeriod(period: string, frequency: Frequency): boolean {
  return (frequency === 'monthly' ? MONTH : QUARTER).test(period)
}

// The first day of a valid period, as 'YYYY-MM-DD'.
export function periodStart(period: string): string {
  const quarter = QUARTER.exec(period)
  if (quarter) return `${quarter[1]}-${String((Number(quarter[2]) - 1) * 3 + 1).padStart(2, '0')}-01`
  return `${period}-01`
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatPeriod(period: string): string {
  const quarter = QUARTER.exec(period)
  if (quarter) return `Q${quarter[2]} ${quarter[1]}`
  const month = MONTH.exec(period)
  if (month) return `${MONTH_NAMES[Number(month[2]) - 1]} ${month[1]}`
  return period
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date)
}

// A plain decimal number; thousands separators (commas, spaces) are allowed. Null if it isn't one.
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(/[,\s]/g, '')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null
  return Number(cleaned)
}

function isWebAddress(text: string): boolean {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Problems with a value draft (R-1, R-4, D-3). `others` are the indicator's other values, without the one being edited.
export function validateValue(
  draft: ValueDraft,
  frequency: Frequency,
  others: IndicatorValue[],
  today: string,
): string[] {
  const problems: string[] = []
  if (!isValidPeriod(draft.period, frequency)) {
    problems.push(frequency === 'monthly' ? 'Choose the month.' : 'Choose the year and quarter.')
  } else {
    if (periodStart(draft.period) > today) problems.push("The period can't be in the future.")
    if (others.some((v) => v.period === draft.period)) {
      problems.push(`There is already a value for ${formatPeriod(draft.period)}; edit that one instead.`)
    }
  }
  const value = parseNumber(draft.value)
  if (value === null) problems.push('Enter the value as a number.')
  else if (value < 0) problems.push("An indicator value can't be negative.")
  const sourceUrl = draft.sourceUrl.trim()
  if (sourceUrl && !isWebAddress(sourceUrl)) problems.push('The source must be a web address starting with http:// or https://.')
  return problems
}

// Problems with a price draft (R-1, D-3). `others` are the stock's other prices, without the one being edited.
export function validatePrice(draft: PriceDraft, others: Price[], today: string): string[] {
  const problems: string[] = []
  if (!isValidDate(draft.date)) problems.push('Choose the date.')
  else {
    if (draft.date > today) problems.push("The date can't be in the future.")
    if (others.some((p) => p.date === draft.date)) {
      problems.push(`There is already a price for ${draft.date}; edit that one instead.`)
    }
  }
  const price = parseNumber(draft.price)
  if (price === null) problems.push('Enter the price as a number.')
  else if (price <= 0) problems.push('A price must be greater than zero.')
  return problems
}

// Builds the stored value from a valid draft.
export function toValue(draft: ValueDraft, indicatorId: string, id: string = crypto.randomUUID()): IndicatorValue {
  const value: IndicatorValue = { id, indicatorId, period: draft.period, value: parseNumber(draft.value)! }
  const sourceUrl = draft.sourceUrl.trim()
  const note = draft.note.trim()
  if (sourceUrl) value.sourceUrl = sourceUrl
  if (note) value.note = note
  return value
}

export function toPrice(draft: PriceDraft, stockId: string, id: string = crypto.randomUUID()): Price {
  return { id, stockId, date: draft.date, price: parseNumber(draft.price)! }
}

export function valueDraft(value?: IndicatorValue): ValueDraft {
  return {
    period: value?.period ?? '',
    value: value ? String(value.value) : '',
    sourceUrl: value?.sourceUrl ?? '',
    note: value?.note ?? '',
  }
}

export function priceDraft(price?: Price): PriceDraft {
  return { date: price?.date ?? '', price: price ? String(price.price) : '' }
}

export function formatNumber(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 })
}
