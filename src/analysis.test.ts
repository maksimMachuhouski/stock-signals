import { describe, expect, test } from 'vitest'
import {
  analyzeStock,
  closestPrice,
  evaluateIndicator,
  roundHalfUp1,
  yearAgoDate,
  yearAgoPeriod,
  type Evaluated,
} from './analysis.ts'
import type { IndicatorValue, Price } from './entries.ts'
import type { AppData } from './storage.ts'

const value = (period: string, v: number, indicatorId = 'i1'): IndicatorValue => ({
  id: `${indicatorId}-${period}`,
  indicatorId,
  period,
  value: v,
})
const price = (date: string, p: number): Price => ({ id: date, stockId: 's1', date, price: p })

// Indicator 100 → 120 (+20%); prices a year apart, 100 → the given price.
function gapWithLatestPrice(latest: number, threshold = 10) {
  return evaluateIndicator(
    [value('2025-Q3', 100), value('2026-Q3', 120)],
    [price('2025-11-20', 100), price('2026-11-20', latest)],
    threshold,
  ) as Evaluated
}

describe('roundHalfUp1', () => {
  test('rounds halves up and removes float noise first', () => {
    expect(roundHalfUp1(9.95)).toBe(10)
    expect(roundHalfUp1(9.949999999999999)).toBe(10)
    expect(roundHalfUp1(9.950000000000003)).toBe(10)
    expect(roundHalfUp1(9.94)).toBe(9.9)
    expect(roundHalfUp1(0.05)).toBe(0.1)
    expect(roundHalfUp1(-0.05)).toBe(-0.1)
    expect(roundHalfUp1(-0.04)).toBe(0)
  })
})

describe('the flag rule (R-6, D-2, D-5)', () => {
  test('a gap that rounds up to the threshold is flagged', () => {
    // 20% − 10.05% = 9.95 → 10.0
    const result = gapWithLatestPrice(110.05)
    expect(result.gap).toBe(10)
    expect(result.flagged).toBe(true)
  })

  test('a gap that rounds down below the threshold is not flagged', () => {
    // 20% − 10.06% = 9.94 → 9.9
    const result = gapWithLatestPrice(110.06)
    expect(result.gap).toBe(9.9)
    expect(result.flagged).toBe(false)
  })

  test('growth and change keep full precision; only the gap is rounded', () => {
    const result = gapWithLatestPrice(110.05)
    expect(result.indicatorGrowth).toBeCloseTo(20, 10)
    expect(result.priceChange).toBeCloseTo(10.05, 10)
  })

  test('a falling price widens the gap', () => {
    // 20% − (−5%) = 25
    expect(gapWithLatestPrice(95).gap).toBe(25)
  })

  test('a changed threshold changes the flag', () => {
    expect(gapWithLatestPrice(105, 10).flagged).toBe(true) // gap 15
    expect(gapWithLatestPrice(105, 15).flagged).toBe(true)
    expect(gapWithLatestPrice(105, 15.1).flagged).toBe(false)
  })

  test('a shrinking indicator is not flagged', () => {
    const result = evaluateIndicator(
      [value('2025-03', 100), value('2026-03', 90)],
      [price('2025-11-20', 100), price('2026-11-20', 100)],
      10,
    ) as Evaluated
    expect(result.gap).toBe(-10)
    expect(result.flagged).toBe(false)
  })
})

describe('what is compared (R-7)', () => {
  test('the latest period with the same period a year earlier', () => {
    const result = evaluateIndicator(
      [value('2025-Q2', 50), value('2025-Q3', 100), value('2026-Q2', 60), value('2026-Q3', 130)],
      [price('2025-11-20', 100), price('2026-11-20', 100)],
      10,
    ) as Evaluated
    expect(result.latestPeriod).toBe('2026-Q3')
    expect(result.yearAgoPeriod).toBe('2025-Q3')
    expect(result.indicatorGrowth).toBeCloseTo(30, 10)
  })

  test('the latest price with the closest price within 30 days of a year before it', () => {
    const result = evaluateIndicator(
      [value('2025-Q3', 100), value('2026-Q3', 100)],
      [price('2025-10-25', 80), price('2025-11-25', 90), price('2026-06-01', 50), price('2026-11-20', 99)],
      10,
    ) as Evaluated
    expect(result.latestPrice.date).toBe('2026-11-20')
    expect(result.yearAgoPrice.date).toBe('2025-11-25')
  })

  test('a price exactly 30 days away counts; 31 days does not', () => {
    expect(closestPrice([price('2025-12-20', 1)], '2025-11-20')?.date).toBe('2025-12-20')
    expect(closestPrice([price('2025-12-21', 1)], '2025-11-20')).toBeUndefined()
    expect(closestPrice([price('2025-10-21', 1)], '2025-11-20')?.date).toBe('2025-10-21')
    expect(closestPrice([price('2025-10-20', 1)], '2025-11-20')).toBeUndefined()
  })

  test('on a tie, the earlier price', () => {
    expect(closestPrice([price('2025-11-25', 2), price('2025-11-15', 1)], '2025-11-20')?.date).toBe('2025-11-15')
  })

  test('year-ago periods and dates', () => {
    expect(yearAgoPeriod('2026-Q1')).toBe('2025-Q1')
    expect(yearAgoPeriod('2026-12')).toBe('2025-12')
    expect(yearAgoDate('2026-11-20')).toBe('2025-11-20')
    expect(yearAgoDate('2028-02-29')).toBe('2027-02-28')
  })
})

describe('unevaluable indicators (R-8)', () => {
  const prices = [price('2025-11-20', 100), price('2026-11-20', 110)]

  test('no values', () => {
    expect(evaluateIndicator([], prices, 10)).toEqual({ status: 'unevaluable', reason: 'no-values' })
  })

  test('the year-ago value is missing', () => {
    expect(evaluateIndicator([value('2026-Q3', 120)], prices, 10)).toMatchObject({
      status: 'unevaluable',
      reason: 'no-year-ago-value',
      latestPeriod: '2026-Q3',
      yearAgoPeriod: '2025-Q3',
    })
  })

  test('the year-ago value is zero', () => {
    expect(evaluateIndicator([value('2025-Q3', 0), value('2026-Q3', 120)], prices, 10)).toMatchObject({
      reason: 'year-ago-value-zero',
    })
  })

  test('no prices, or none within 30 days of the year-ago date', () => {
    const values = [value('2025-Q3', 100), value('2026-Q3', 120)]
    expect(evaluateIndicator(values, [], 10)).toMatchObject({ reason: 'no-prices' })
    expect(evaluateIndicator(values, [price('2025-12-21', 100), price('2026-11-20', 110)], 10)).toMatchObject({
      reason: 'no-year-ago-price',
      yearAgoDate: '2025-11-20',
    })
  })
})

describe('a stock (R-6, R-10)', () => {
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
    ],
    values: [
      value('2025-Q3', 100, 'i1'),
      value('2026-Q3', 130, 'i1'),
      value('2025-Q3', 100, 'i2'),
      value('2026-Q3', 105, 'i2'),
    ],
    prices: [price('2025-11-20', 100), price('2026-11-20', 110)],
    threshold: 10,
  }

  test('each indicator is evaluated on its own; one flag flags the stock', () => {
    const result = analyzeStock(data, data.stocks[0])
    expect(result.indicators.map(({ result }) => (result as Evaluated).gap)).toEqual([20, -5])
    expect(result.indicators.map(({ result }) => (result as Evaluated).flagged)).toEqual([true, false])
    expect(result.flagged).toBe(true)
  })

  test('a stock with no flagged indicator is not flagged', () => {
    expect(analyzeStock({ ...data, threshold: 25 }, data.stocks[0]).flagged).toBe(false)
  })
})
