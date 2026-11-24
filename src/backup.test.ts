import { expect, test } from 'vitest'
import { describeData, exportBackup, parseBackup } from './backup.ts'
import type { AppData } from './storage.ts'

const today = '2026-11-24'

const data: AppData = {
  version: 1,
  stocks: [
    {
      id: 's1',
      name: 'Tesla',
      ticker: 'TSLA',
      indicators: [
        { id: 'i1', name: 'Deliveries', unit: 'vehicles', frequency: 'quarterly' },
        { id: 'i2', name: 'Energy storage', unit: 'GWh', frequency: 'monthly' },
      ],
    },
    { id: 's2', name: 'Apple', ticker: 'AAPL', indicators: [{ id: 'i3', name: 'Units', unit: 'm', frequency: 'monthly' }] },
  ],
  values: [
    { id: 'v1', indicatorId: 'i1', period: '2026-Q3', value: 497099, sourceUrl: 'https://ir.tesla.com', note: 'record' },
    { id: 'v2', indicatorId: 'i2', period: '2026-10', value: 0.0000001 },
    { id: 'v3', indicatorId: 'i3', period: '2026-11', value: 0 },
  ],
  prices: [
    { id: 'p1', stockId: 's1', date: '2026-11-20', price: 250.5 },
    { id: 'p2', stockId: 's2', date: '2025-11-20', price: 200 },
  ],
  threshold: 12.5,
}

function fileWith(change: (file: Record<string, unknown>) => void): string {
  const file = JSON.parse(exportBackup(data).text) as Record<string, unknown>
  change(file)
  return JSON.stringify(file)
}

function problemsOf(text: string): string[] {
  const result = parseBackup(text, today)
  if (result.ok) throw new Error('expected the file to be refused')
  return result.problems
}

test('an export holds all stocks, indicators, values, prices, and the threshold', () => {
  const { fileName, text } = exportBackup(data, new Date('2026-11-24T10:00:00Z'))
  expect(fileName).toBe('stock-signals-2026-11-24.json')
  const file = JSON.parse(text)
  expect(file).toMatchObject({ app: 'stock-signals', exportedAt: '2026-11-24T10:00:00.000Z', ...data })
})

test('an exported file imports back to the same data', () => {
  const result = parseBackup(exportBackup(data, new Date('2026-11-24T10:00:00Z')).text, today)
  expect(result).toEqual({ ok: true, data, exportedAt: '2026-11-24T10:00:00.000Z' })
})

test('an export of no data imports back to no data', () => {
  const empty: AppData = { version: 1, stocks: [], values: [], prices: [], threshold: 10 }
  expect(parseBackup(exportBackup(empty).text, today)).toMatchObject({ ok: true, data: empty })
})

test('a file that is not JSON, or not this app’s export, is refused', () => {
  expect(problemsOf('not json')).toEqual(['The file is not JSON.'])
  expect(problemsOf('[]')).toEqual(['The file is not a Stock signals export.'])
  // The browser's saved data, without the export's mark.
  expect(problemsOf(JSON.stringify(data))).toEqual(['The file is not a Stock signals export.'])
  expect(problemsOf(fileWith((f) => (f.version = 2)))).toEqual(["The file's version (2) is not one this app reads."])
  expect(problemsOf(fileWith((f) => delete f.prices))).toEqual(['The file is missing its stocks, values, or prices.'])
})

test('a file that breaks the entry rules is refused with every reason', () => {
  const problems = problemsOf(
    fileWith((f) => {
      const stocks = f.stocks as AppData['stocks']
      stocks[1].ticker = 'tsla'
      stocks[1].indicators = []
      const values = f.values as AppData['values']
      values.push({ id: 'v4', indicatorId: 'i1', period: '2026-Q3', value: 1 })
      values.push({ id: 'v5', indicatorId: 'i2', period: '2026-Q4', value: 1 })
      values.push({ id: 'v6', indicatorId: 'gone', period: '2026-01', value: 1 })
      values.push({ id: 'v7', indicatorId: 'i2', period: '2026-12', value: -1 })
      const prices = f.prices as AppData['prices']
      prices.push({ id: 'p3', stockId: 's1', date: '2026-11-25', price: 0 })
      prices.push({ id: 'p1', stockId: 's1', date: '2026-11-01', price: 1 })
      f.threshold = -1
    }),
  )
  expect(problems).toEqual([
    'TSLA appears twice.',
    'TSLA must have one or two indicators.',
    // Its values went with the removed indicator.
    'Value 3 belongs to no indicator in the file.',
    'Deliveries for 2026-Q3 appears twice.',
    "Value 5 (Energy storage) has a period that doesn't fit a monthly indicator.",
    'Value 6 belongs to no indicator in the file.',
    'Energy storage for 2026-12 is in the future.',
    'Energy storage for 2026-12 is negative.',
    "TSLA's price on 2026-11-25 is in the future.",
    "TSLA's price on 2026-11-25 is not greater than zero.",
    'Price 4 repeats the id p1.',
    'The threshold must be a number, 0 or more.',
  ])
})

test('values and prices must be numbers', () => {
  const problems = problemsOf(
    fileWith((f) => {
      ;(f.values as Record<string, unknown>[])[0].value = '497099'
      ;(f.prices as Record<string, unknown>[])[0].price = null
    }),
  )
  expect(problems).toEqual(['Deliveries for 2026-Q3 is not a number.', "TSLA's price on 2026-11-20 is not a number."])
})

test('the confirmation describes what is replaced', () => {
  expect(describeData(data)).toBe('2 stocks, 3 indicator values and 2 prices')
  expect(describeData({ ...data, stocks: [data.stocks[0]], values: [], prices: [] })).toBe('1 stock')
})
