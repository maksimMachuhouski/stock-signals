import type { Stock } from './stocks.ts'

// Everything the app keeps, saved in the browser's local storage (D-1).
// Later tickets add indicator values and prices here.
export interface AppData {
  version: 1
  stocks: Stock[]
}

export const STORAGE_KEY = 'stock-signals'

export function emptyData(): AppData {
  return { version: 1, stocks: [] }
}

// A storage that is missing, unreadable, or holds something else starts the app empty.
export function loadData(storage: Pick<Storage, 'getItem'> | undefined): AppData {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    if (parsed.version !== 1 || !Array.isArray(parsed.stocks)) return emptyData()
    return { version: 1, stocks: parsed.stocks }
  } catch {
    return emptyData()
  }
}

export function saveData(storage: Pick<Storage, 'setItem'> | undefined, data: AppData): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify(data))
}
