import { expect, test } from 'vitest'
import { emptyData, loadData, saveData, STORAGE_KEY, type AppData } from './storage.ts'

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

const data: AppData = {
  version: 1,
  stocks: [
    {
      id: 's1',
      name: 'Tesla',
      ticker: 'TSLA',
      indicators: [{ id: 'i1', name: 'Deliveries', unit: 'vehicles', frequency: 'quarterly' }],
    },
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
