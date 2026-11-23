import type { IndicatorValue, Price } from './entries.ts'
import type { Stock } from './stocks.ts'

// Everything the app keeps, saved in the browser's local storage (D-1).
export interface AppData {
  version: 1
  stocks: Stock[]
  values: IndicatorValue[]
  prices: Price[]
  // The gap, in percentage points, at which an indicator is flagged (R-6).
  threshold: number
}

export const STORAGE_KEY = 'stock-signals'
export const DEFAULT_THRESHOLD = 10

export function emptyData(): AppData {
  return { version: 1, stocks: [], values: [], prices: [], threshold: DEFAULT_THRESHOLD }
}

// A storage that is missing, unreadable, or holds something else starts the app empty.
// Data saved before values, prices, or the threshold existed loads with none and the default threshold.
export function loadData(storage: Pick<Storage, 'getItem'> | undefined): AppData {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    if (parsed.version !== 1 || !Array.isArray(parsed.stocks)) return emptyData()
    return {
      version: 1,
      stocks: parsed.stocks,
      values: Array.isArray(parsed.values) ? parsed.values : [],
      prices: Array.isArray(parsed.prices) ? parsed.prices : [],
      threshold: typeof parsed.threshold === 'number' ? parsed.threshold : DEFAULT_THRESHOLD,
    }
  } catch {
    return emptyData()
  }
}

export function saveData(storage: Pick<Storage, 'setItem'> | undefined, data: AppData): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify(data))
}

// Replaces a stock after an edit; values of an indicator the edit removed go with it.
export function replaceStock(data: AppData, stock: Stock): AppData {
  const indicatorIds = new Set(stock.indicators.map((i) => i.id))
  const old = data.stocks.find((s) => s.id === stock.id)
  const removed = new Set(old?.indicators.filter((i) => !indicatorIds.has(i.id)).map((i) => i.id))
  return {
    ...data,
    stocks: data.stocks.map((s) => (s.id === stock.id ? stock : s)),
    values: data.values.filter((v) => !removed.has(v.indicatorId)),
  }
}

// Removes a stock with its indicators' values and its prices.
export function removeStock(data: AppData, stockId: string): AppData {
  const stock = data.stocks.find((s) => s.id === stockId)
  const indicatorIds = new Set(stock?.indicators.map((i) => i.id))
  return {
    ...data,
    stocks: data.stocks.filter((s) => s.id !== stockId),
    values: data.values.filter((v) => !indicatorIds.has(v.indicatorId)),
    prices: data.prices.filter((p) => p.stockId !== stockId),
  }
}

// How much recorded data goes with a stock or with some of its indicators (R-5).
export interface DataCount {
  values: number
  prices: number
}

export function countStockData(data: AppData, stockId: string): DataCount {
  const stock = data.stocks.find((s) => s.id === stockId)
  const indicatorIds = new Set(stock?.indicators.map((i) => i.id))
  return {
    values: data.values.filter((v) => indicatorIds.has(v.indicatorId)).length,
    prices: data.prices.filter((p) => p.stockId === stockId).length,
  }
}

// "3 indicator values and 1 price", or "" when there is nothing.
export function describeCount({ values, prices }: DataCount): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return [
    values > 0 && plural(values, 'indicator value', 'indicator values'),
    prices > 0 && plural(prices, 'price', 'prices'),
  ]
    .filter(Boolean)
    .join(' and ')
}
