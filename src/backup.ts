import { isValidDate, isValidPeriod, periodStart, type IndicatorValue, type Price } from './entries.ts'
import { MAX_INDICATORS, normalizeTicker, type Indicator, type Stock } from './stocks.ts'
import { describeCount, type AppData } from './storage.ts'

// Export and import (R-15): the data lives in one browser, and the exported file is its backup.

const APP = 'stock-signals'

// What the file holds: the app's data, marked as this app's export.
export interface BackupFile extends AppData {
  app: typeof APP
  exportedAt: string
}

export function exportBackup(data: AppData, now: Date = new Date()): { fileName: string; text: string } {
  const file: BackupFile = { app: APP, exportedAt: now.toISOString(), ...data }
  const day = file.exportedAt.slice(0, 10)
  return { fileName: `stock-signals-${day}.json`, text: JSON.stringify(file, null, 2) }
}

export type ImportResult = { ok: true; data: AppData; exportedAt: string } | { ok: false; problems: string[] }

// Reads an exported file. Anything that isn't a whole, consistent export is refused with the reasons,
// and nothing is replaced: the same rules as entering data by hand (R-1, R-2, R-4, D-3) apply.
export function parseBackup(text: string, today: string): ImportResult {
  let file: unknown
  try {
    file = JSON.parse(text)
  } catch {
    return refuse(['The file is not JSON.'])
  }
  if (!isObject(file) || file.app !== APP) return refuse(['The file is not a Stock signals export.'])
  if (file.version !== 1) return refuse([`The file's version (${String(file.version)}) is not one this app reads.`])
  if (!Array.isArray(file.stocks) || !Array.isArray(file.values) || !Array.isArray(file.prices)) {
    return refuse(['The file is missing its stocks, values, or prices.'])
  }

  const problems: string[] = []
  const ids = new Set<string>()
  const uniqueId = (id: unknown, what: string): id is string => {
    if (typeof id !== 'string' || !id) {
      problems.push(`${what} has no id.`)
      return false
    }
    if (ids.has(id)) {
      problems.push(`${what} repeats the id ${id}.`)
      return false
    }
    ids.add(id)
    return true
  }

  const stocks: Stock[] = []
  const indicators = new Map<string, Indicator>()
  const tickers = new Set<string>()
  file.stocks.forEach((s, i) => {
    const what = `Stock ${i + 1}`
    if (!isObject(s) || !uniqueId(s.id, what)) return
    const name = str(s.name)
    const ticker = normalizeTicker(str(s.ticker))
    if (!name) problems.push(`${what} has no name.`)
    if (!ticker) problems.push(`${what} has no ticker.`)
    else if (tickers.has(ticker)) problems.push(`${ticker} appears twice.`)
    tickers.add(ticker)
    const label = ticker || what
    const list: unknown[] = Array.isArray(s.indicators) ? s.indicators : []
    if (list.length < 1 || list.length > MAX_INDICATORS) problems.push(`${label} must have one or two indicators.`)
    const stockIndicators: Indicator[] = []
    list.forEach((ind, j) => {
      const indWhat = `${label}'s indicator ${j + 1}`
      if (!isObject(ind) || !uniqueId(ind.id, indWhat)) return
      const indicator = {
        id: ind.id,
        name: str(ind.name),
        unit: str(ind.unit),
        frequency: ind.frequency,
      }
      if (!indicator.name) problems.push(`${indWhat} has no name.`)
      if (!indicator.unit) problems.push(`${indWhat} has no unit.`)
      if (indicator.frequency !== 'monthly' && indicator.frequency !== 'quarterly') {
        problems.push(`${indWhat} must be monthly or quarterly.`)
        return
      }
      stockIndicators.push(indicator as Indicator)
      indicators.set(indicator.id, indicator as Indicator)
    })
    stocks.push({ id: s.id, name, ticker, indicators: stockIndicators })
  })

  const values: IndicatorValue[] = []
  const periods = new Set<string>()
  file.values.forEach((v, i) => {
    const what = `Value ${i + 1}`
    if (!isObject(v) || !uniqueId(v.id, what)) return
    const indicator = typeof v.indicatorId === 'string' ? indicators.get(v.indicatorId) : undefined
    if (!indicator) return problems.push(`${what} belongs to no indicator in the file.`)
    const period = typeof v.period === 'string' ? v.period : ''
    if (!isValidPeriod(period, indicator.frequency)) {
      return problems.push(`${what} (${indicator.name}) has a period that doesn't fit a ${indicator.frequency} indicator.`)
    }
    const where = `${indicator.name} for ${period}`
    if (periodStart(period) > today) problems.push(`${where} is in the future.`)
    if (periods.has(`${indicator.id} ${period}`)) problems.push(`${where} appears twice.`)
    periods.add(`${indicator.id} ${period}`)
    if (!isNumber(v.value)) return problems.push(`${where} is not a number.`)
    if (v.value < 0) problems.push(`${where} is negative.`)
    const value: IndicatorValue = { id: v.id, indicatorId: indicator.id, period, value: v.value }
    if (v.sourceUrl !== undefined) value.sourceUrl = str(v.sourceUrl)
    if (v.note !== undefined) value.note = str(v.note)
    values.push(value)
  })

  const prices: Price[] = []
  const dates = new Set<string>()
  file.prices.forEach((p, i) => {
    const what = `Price ${i + 1}`
    if (!isObject(p) || !uniqueId(p.id, what)) return
    const stock = stocks.find((s) => s.id === p.stockId)
    if (!stock) return problems.push(`${what} belongs to no stock in the file.`)
    const date = typeof p.date === 'string' ? p.date : ''
    if (!isValidDate(date)) return problems.push(`${what} (${stock.ticker}) has no valid date.`)
    const where = `${stock.ticker}'s price on ${date}`
    if (date > today) problems.push(`${where} is in the future.`)
    if (dates.has(`${stock.id} ${date}`)) problems.push(`${where} appears twice.`)
    dates.add(`${stock.id} ${date}`)
    if (!isNumber(p.price)) return problems.push(`${where} is not a number.`)
    if (p.price <= 0) problems.push(`${where} is not greater than zero.`)
    prices.push({ id: p.id, stockId: stock.id, date, price: p.price })
  })

  if (!isNumber(file.threshold) || file.threshold < 0) problems.push('The threshold must be a number, 0 or more.')

  if (problems.length > 0) return refuse(problems)
  return {
    ok: true,
    data: { version: 1, stocks, values, prices, threshold: file.threshold as number },
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
  }
}

// "2 stocks, 5 indicator values and 3 prices", for the confirmation.
export function describeData(data: AppData): string {
  const stocks = `${data.stocks.length} ${data.stocks.length === 1 ? 'stock' : 'stocks'}`
  const rest = describeCount({ values: data.values.length, prices: data.prices.length })
  return rest ? `${stocks}, ${rest}` : stocks
}

function refuse(problems: string[]): ImportResult {
  return { ok: false, problems }
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function isNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x)
}

function str(x: unknown): string {
  return typeof x === 'string' ? x.trim() : ''
}
