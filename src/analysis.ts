import type { IndicatorValue, Price } from './entries.ts'
import type { AppData } from './storage.ts'
import type { Indicator, Stock } from './stocks.ts'

// The signal (R-6 – R-9): each indicator is evaluated on its own. Its latest value is compared with the value
// for the same period a year earlier; the stock's latest price with the price closest to a year before it,
// within 30 days. The gap is the indicator's growth minus the price's change, in percentage points,
// calculated at full precision, rounded half up to one decimal (D-2, D-5), and that rounded gap is compared
// with the threshold. Results are derived from the data on every render, so they follow each change at once (R-9).

export const PRICE_WINDOW_DAYS = 30

export interface Evaluated {
  status: 'evaluated'
  latestPeriod: string
  yearAgoPeriod: string
  // Full precision, in percent.
  indicatorGrowth: number
  priceChange: number
  // Rounded half up to one decimal; what is compared and shown.
  gap: number
  flagged: boolean
  latestPrice: Price
  yearAgoPrice: Price
}

export type MissingReason =
  | 'no-values'
  | 'no-year-ago-value'
  | 'year-ago-value-zero'
  | 'no-prices'
  | 'no-year-ago-price'

export interface Unevaluable {
  status: 'unevaluable'
  reason: MissingReason
  // The periods and dates the reason is about, so it can be described.
  latestPeriod?: string
  yearAgoPeriod?: string
  yearAgoDate?: string
}

export type IndicatorResult = Evaluated | Unevaluable

export interface StockResult {
  stock: Stock
  indicators: { indicator: Indicator; result: IndicatorResult }[]
  // Flagged when any of its indicators is (R-10).
  flagged: boolean
}

// Rounds half away from zero to one decimal: 9.95 → 10.0, 9.94 → 9.9, -0.05 → -0.1.
// Float noise is removed first, so a gap like 9.950000000000003 or 9.949999999999999 rounds as 9.95.
export function roundHalfUp1(x: number): number {
  const tenths = Number((Math.abs(x) * 10).toPrecision(12))
  const rounded = Math.floor(tenths + 0.5) / 10
  return x < 0 && rounded !== 0 ? -rounded : rounded
}

export function percentChange(from: number, to: number): number {
  return ((to - from) / from) * 100
}

// The same period a year earlier: '2026-Q3' → '2025-Q3', '2026-03' → '2025-03'.
export function yearAgoPeriod(period: string): string {
  return `${Number(period.slice(0, 4)) - 1}${period.slice(4)}`
}

// The same date a year earlier; 29 February becomes 28 February.
export function yearAgoDate(date: string): string {
  const year = Number(date.slice(0, 4)) - 1
  const monthDay = date.slice(5) === '02-29' ? '02-28' : date.slice(5)
  return `${year}-${monthDay}`
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000
}

// The price closest to the date, within the window; on a tie, the earlier one.
export function closestPrice(prices: Price[], date: string, windowDays = PRICE_WINDOW_DAYS): Price | undefined {
  let best: Price | undefined
  for (const price of prices) {
    const distance = daysBetween(price.date, date)
    if (distance > windowDays) continue
    if (!best) best = price
    else {
      const bestDistance = daysBetween(best.date, date)
      if (distance < bestDistance || (distance === bestDistance && price.date < best.date)) best = price
    }
  }
  return best
}

export function evaluateIndicator(values: IndicatorValue[], prices: Price[], threshold: number): IndicatorResult {
  if (values.length === 0) return { status: 'unevaluable', reason: 'no-values' }
  const latest = values.reduce((a, b) => (b.period > a.period ? b : a))
  const priorPeriod = yearAgoPeriod(latest.period)
  const periods = { latestPeriod: latest.period, yearAgoPeriod: priorPeriod }
  const prior = values.find((v) => v.period === priorPeriod)
  if (!prior) return { status: 'unevaluable', reason: 'no-year-ago-value', ...periods }
  if (prior.value === 0) return { status: 'unevaluable', reason: 'year-ago-value-zero', ...periods }

  if (prices.length === 0) return { status: 'unevaluable', reason: 'no-prices', ...periods }
  const latestPrice = prices.reduce((a, b) => (b.date > a.date ? b : a))
  const target = yearAgoDate(latestPrice.date)
  const yearAgoPrice = closestPrice(prices, target)
  if (!yearAgoPrice) return { status: 'unevaluable', reason: 'no-year-ago-price', ...periods, yearAgoDate: target }

  const indicatorGrowth = percentChange(prior.value, latest.value)
  const priceChange = percentChange(yearAgoPrice.price, latestPrice.price)
  const gap = roundHalfUp1(indicatorGrowth - priceChange)
  return {
    status: 'evaluated',
    ...periods,
    indicatorGrowth,
    priceChange,
    gap,
    flagged: gap >= threshold,
    latestPrice,
    yearAgoPrice,
  }
}

export function analyzeStock(data: AppData, stock: Stock): StockResult {
  const prices = data.prices.filter((p) => p.stockId === stock.id)
  const indicators = stock.indicators.map((indicator) => ({
    indicator,
    result: evaluateIndicator(
      data.values.filter((v) => v.indicatorId === indicator.id),
      prices,
      data.threshold,
    ),
  }))
  return {
    stock,
    indicators,
    flagged: indicators.some(({ result }) => result.status === 'evaluated' && result.flagged),
  }
}
