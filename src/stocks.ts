// Stocks and their business indicators (R-2): each stock has one or two indicators,
// each published monthly or quarterly.

export type Frequency = 'monthly' | 'quarterly'

export interface Indicator {
  id: string
  name: string
  unit: string
  frequency: Frequency
}

export interface Stock {
  id: string
  name: string
  ticker: string
  indicators: Indicator[]
}

// What the form edits: the same shape without ids on new rows.
export interface StockDraft {
  name: string
  ticker: string
  indicators: { id?: string; name: string; unit: string; frequency: Frequency }[]
}

export const MAX_INDICATORS = 2

// Problems that stop a draft from being saved; empty when it's valid.
export function validateStock(draft: StockDraft, others: Stock[]): string[] {
  const problems: string[] = []
  if (!draft.name.trim()) problems.push('Enter the stock name.')
  const ticker = normalizeTicker(draft.ticker)
  if (!ticker) problems.push('Enter the ticker.')
  else if (others.some((s) => s.ticker === ticker)) problems.push(`${ticker} is already tracked.`)
  if (draft.indicators.length < 1 || draft.indicators.length > MAX_INDICATORS) {
    problems.push('A stock has one or two indicators.')
  }
  draft.indicators.forEach((indicator, i) => {
    if (!indicator.name.trim()) problems.push(`Enter indicator ${i + 1}'s name.`)
    if (!indicator.unit.trim()) problems.push(`Enter indicator ${i + 1}'s unit.`)
  })
  return problems
}

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase()
}

// Builds the stored stock from a valid draft, keeping existing ids so later data stays linked.
export function toStock(draft: StockDraft, id: string = crypto.randomUUID()): Stock {
  return {
    id,
    name: draft.name.trim(),
    ticker: normalizeTicker(draft.ticker),
    indicators: draft.indicators.map((indicator) => ({
      id: indicator.id ?? crypto.randomUUID(),
      name: indicator.name.trim(),
      unit: indicator.unit.trim(),
      frequency: indicator.frequency,
    })),
  }
}

export function toDraft(stock: Stock): StockDraft {
  return {
    name: stock.name,
    ticker: stock.ticker,
    indicators: stock.indicators.map((indicator) => ({ ...indicator })),
  }
}

export function emptyIndicator(): StockDraft['indicators'][number] {
  return { name: '', unit: '', frequency: 'quarterly' }
}
