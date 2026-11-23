import { expect, test } from 'vitest'
import { removalText } from './StockForm.tsx'
import { countStockData, describeCount, removeStock, type AppData } from './storage.ts'

// R-5: what deleting a stock or an indicator removes, and how it's counted for the confirmation.

const data: AppData = {
  version: 1,
  stocks: [
    {
      id: 's1',
      name: 'Tesla',
      ticker: 'TSLA',
      indicators: [
        { id: 'i1', name: 'Deliveries', unit: 'vehicles', frequency: 'quarterly' },
        { id: 'i2', name: 'Energy storage', unit: 'GWh', frequency: 'quarterly' },
      ],
    },
    { id: 's2', name: 'Apple', ticker: 'AAPL', indicators: [{ id: 'i3', name: 'Units', unit: 'm', frequency: 'monthly' }] },
  ],
  values: [
    { id: 'v1', indicatorId: 'i1', period: '2026-Q1', value: 1 },
    { id: 'v2', indicatorId: 'i1', period: '2026-Q2', value: 2 },
    { id: 'v3', indicatorId: 'i2', period: '2026-Q1', value: 3 },
    { id: 'v4', indicatorId: 'i3', period: '2026-03', value: 4 },
  ],
  prices: [
    { id: 'p1', stockId: 's1', date: '2026-04-01', price: 250 },
    { id: 'p2', stockId: 's2', date: '2026-04-01', price: 200 },
  ],
}

test("a stock's count covers all its indicators' values and its prices", () => {
  expect(countStockData(data, 's1')).toEqual({ values: 3, prices: 1 })
  expect(countStockData(data, 's2')).toEqual({ values: 1, prices: 1 })
})

test('the count matches what removing the stock deletes', () => {
  const after = removeStock(data, 's1')
  expect(data.values.length - after.values.length).toBe(3)
  expect(data.prices.length - after.prices.length).toBe(1)
})

test('counts read as text', () => {
  expect(describeCount({ values: 3, prices: 1 })).toBe('3 indicator values and 1 price')
  expect(describeCount({ values: 1, prices: 0 })).toBe('1 indicator value')
  expect(describeCount({ values: 0, prices: 2 })).toBe('2 prices')
  expect(describeCount({ values: 0, prices: 0 })).toBe('')
  expect(removalText('Energy storage', 1)).toBe('Saving removes Energy storage and deletes its 1 value.')
  expect(removalText('Deliveries', 2)).toBe('Saving removes Deliveries and deletes its 2 values.')
})
