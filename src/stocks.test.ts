import { describe, expect, test } from 'vitest'
import { toDraft, toStock, validateStock, type StockDraft } from './stocks.ts'

const draft = (change: Partial<StockDraft> = {}): StockDraft => ({
  name: 'Tesla',
  ticker: 'tsla',
  indicators: [{ name: 'Deliveries', unit: 'vehicles', frequency: 'quarterly' }],
  ...change,
})

describe('validateStock', () => {
  test('a stock with a name, a ticker, and one indicator is valid', () => {
    expect(validateStock(draft(), [])).toEqual([])
  })

  test('a stock with two indicators is valid', () => {
    const two = draft({
      indicators: [
        { name: 'Deliveries', unit: 'vehicles', frequency: 'quarterly' },
        { name: 'Energy storage', unit: 'GWh', frequency: 'monthly' },
      ],
    })
    expect(validateStock(two, [])).toEqual([])
  })

  test('no indicators or three indicators are refused', () => {
    expect(validateStock(draft({ indicators: [] }), [])).toContain('A stock has one or two indicators.')
    const indicator = { name: 'X', unit: 'u', frequency: 'monthly' as const }
    expect(validateStock(draft({ indicators: [indicator, indicator, indicator] }), [])).toContain(
      'A stock has one or two indicators.',
    )
  })

  test('blank name, ticker, and indicator fields are refused', () => {
    const blank = draft({ name: ' ', ticker: '', indicators: [{ name: '', unit: ' ', frequency: 'monthly' }] })
    expect(validateStock(blank, [])).toEqual([
      'Enter the stock name.',
      'Enter the ticker.',
      "Enter indicator 1's name.",
      "Enter indicator 1's unit.",
    ])
  })

  test('a ticker already tracked is refused, ignoring case and spaces', () => {
    const tracked = toStock(draft())
    expect(validateStock(draft({ ticker: ' Tsla ' }), [tracked])).toEqual(['TSLA is already tracked.'])
  })
})

describe('toStock', () => {
  test('trims fields, upper-cases the ticker, and gives new rows ids', () => {
    const stock = toStock(draft({ name: ' Tesla ', ticker: ' tsla ' }))
    expect(stock.name).toBe('Tesla')
    expect(stock.ticker).toBe('TSLA')
    expect(stock.indicators[0].id).toBeTruthy()
  })

  test('editing keeps the stock and indicator ids', () => {
    const stock = toStock(draft())
    const edited = toStock({ ...toDraft(stock), name: 'Tesla Inc.' }, stock.id)
    expect(edited.id).toBe(stock.id)
    expect(edited.indicators[0].id).toBe(stock.indicators[0].id)
    expect(edited.name).toBe('Tesla Inc.')
  })
})
