import { expect, test } from 'vitest'
import { emptyData, loadData, removeStock, replaceStock, saveData, STORAGE_KEY, type AppData } from './storage.ts'

function memoryStorage(initial: Record<string, string> = {}) {
  const items = { ...initial }
  return {
    items,
    getItem: (key: string) => items[key] ?? null,
    setItem: (key: string, value: string) => {
      items[key] = value
    },
  }
}

const tesla = {
  id: 's1',
  name: 'Tesla',
  ticker: 'TSLA',
  indicators: [
    { id: 'i1', name: 'Deliveries', unit: 'vehicles', frequency: 'quarterly' as const },
    { id: 'i2', name: 'Energy storage', unit: 'GWh', frequency: 'quarterly' as const },
  ],
}
const apple = { id: 's2', name: 'Apple', ticker: 'AAPL', indicators: [{ id: 'i3', name: 'Units', unit: 'm', frequency: 'monthly' as const }] }

const data: AppData = {
  version: 1,
  stocks: [tesla, apple],
  values: [
    { id: 'v1', indicatorId: 'i1', period: '2026-Q1', value: 336681 },
    { id: 'v2', indicatorId: 'i2', period: '2026-Q1', value: 10.4 },
    { id: 'v3', indicatorId: 'i3', period: '2026-03', value: 5 },
  ],
  prices: [
    { id: 'p1', stockId: 's1', date: '2026-04-01', price: 250 },
    { id: 'p2', stockId: 's2', date: '2026-04-01', price: 200 },
  ],
}

test('saved data loads back unchanged', () => {
  const storage = memoryStorage()
  saveData(storage, data)
  expect(loadData(storage)).toEqual(data)
})

test('missing, unreadable, or unknown data starts empty', () => {
  expect(loadData(undefined)).toEqual(emptyData())
  expect(loadData(memoryStorage())).toEqual(emptyData())
  expect(loadData(memoryStorage({ [STORAGE_KEY]: 'not json' }))).toEqual(emptyData())
  expect(loadData(memoryStorage({ [STORAGE_KEY]: '{"version":2,"stocks":[]}' }))).toEqual(emptyData())
})

test('data saved before values and prices existed loads with none', () => {
  const old = JSON.stringify({ version: 1, stocks: [tesla] })
  expect(loadData(memoryStorage({ [STORAGE_KEY]: old }))).toEqual({ version: 1, stocks: [tesla], values: [], prices: [] })
})

test('removing a stock removes its values and prices, and no others', () => {
  const after = removeStock(data, 's1')
  expect(after.stocks.map((s) => s.id)).toEqual(['s2'])
  expect(after.values.map((v) => v.id)).toEqual(['v3'])
  expect(after.prices.map((p) => p.id)).toEqual(['p2'])
})

test('an edit that drops an indicator removes that indicator’s values only', () => {
  const after = replaceStock(data, { ...tesla, name: 'Tesla Inc.', indicators: [tesla.indicators[0]] })
  expect(after.stocks[0].name).toBe('Tesla Inc.')
  expect(after.values.map((v) => v.id)).toEqual(['v1', 'v3'])
  expect(after.prices).toEqual(data.prices)
})
