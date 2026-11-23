import { renderToString } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { describeMissing, formatDate, oneDecimal, signedPercent } from './display.ts'
import type { IndicatorValue, Price } from './entries.ts'
import { SignalList } from './SignalList.tsx'
import type { AppData } from './storage.ts'

const value = (indicatorId: string, period: string, v: number): IndicatorValue => ({
  id: `${indicatorId}-${period}`,
  indicatorId,
  period,
  value: v,
})
const price = (stockId: string, date: string, p: number): Price => ({ id: `${stockId}-${date}`, stockId, date, price: p })

// Apple (added first) isn't flagged; Tesla is, through one of its two indicators.
const data: AppData = {
  version: 1,
  stocks: [
    { id: 'a', name: 'Apple', ticker: 'AAPL', indicators: [{ id: 'a1', name: 'iPhone units', unit: 'm', frequency: 'quarterly' }] },
    {
      id: 't',
      name: 'Tesla',
      ticker: 'TSLA',
      indicators: [
        { id: 't1', name: 'Deliveries', unit: 'vehicles', frequency: 'quarterly' },
        { id: 't2', name: 'Energy storage', unit: 'GWh', frequency: 'quarterly' },
      ],
    },
  ],
  values: [
    value('a1', '2025-Q3', 100),
    value('a1', '2026-Q3', 105),
    value('t1', '2025-Q3', 1000),
    value('t1', '2026-Q3', 1120),
    value('t2', '2026-Q3', 12),
  ],
  prices: [
    price('a', '2025-11-20', 100),
    price('a', '2026-11-20', 110),
    price('t', '2025-11-20', 100),
    price('t', '2026-11-20', 102.05),
  ],
  threshold: 10,
}

const render = (d: AppData) => renderToString(<SignalList data={d} onThreshold={() => {}} />)

describe('the signal list (R-10)', () => {
  test('flagged stocks come first, each with its indicators under it', () => {
    const html = render(data)
    expect(html.indexOf('TSLA')).toBeLessThan(html.indexOf('AAPL'))
    expect(html.indexOf('Deliveries')).toBeLessThan(html.indexOf('Energy storage'))
    expect(html.indexOf('Energy storage')).toBeLessThan(html.indexOf('AAPL'))
  })

  test('a stock with one flagged indicator is marked flagged', () => {
    const html = render(data)
    const tesla = html.slice(html.indexOf('TSLA'), html.indexOf('AAPL'))
    // The header's own mark, before its indicator rows.
    expect(tesla.slice(0, tesla.indexOf('<ul>'))).toContain('Flagged')
    expect(html.slice(html.indexOf('AAPL'))).not.toContain('Flagged')
  })

  test('a higher threshold unflags it, and the stocks keep the order they were added in', () => {
    const html = render({ ...data, threshold: 10.1 })
    expect(html).not.toContain('Flagged')
    expect(html.indexOf('AAPL')).toBeLessThan(html.indexOf('TSLA'))
  })
})

describe('an indicator row (R-11, D-4)', () => {
  test('shows growth, price change, and the gap against the threshold, to one decimal', () => {
    const html = render(data)
    // 1000 → 1120 is +12.0%; 100 → 102.05 is +2.05%, shown +2.1%; the gap 9.95 rounds to 10.0.
    expect(html).toContain('Indicator +12.0%')
    expect(html).toContain('Price +2.1%')
    expect(html).toContain('Gap 10.0 pp ≥ 10.0')
    expect(html).toContain('Q3 2025 → Q3 2026')
    expect(html).toContain('20 Nov 2025 → 20 Nov 2026')
  })

  test('says why an indicator is unevaluable', () => {
    expect(render(data)).toContain('No value for Q3 2025 to compare Q3 2026 with.')
  })

  test('the threshold is shown in its input', () => {
    expect(render(data)).toContain('value="10"')
  })
})

describe('wording', () => {
  test('numbers', () => {
    expect(oneDecimal(9.95)).toBe('10.0')
    expect(oneDecimal(3)).toBe('3.0')
    expect(oneDecimal(-5)).toBe('−5.0')
    expect(oneDecimal(-0.04)).toBe('0.0')
    expect(signedPercent(2.05)).toBe('+2.1%')
    expect(signedPercent(-5)).toBe('−5.0%')
    expect(signedPercent(0.04)).toBe('0.0%')
    expect(formatDate('2025-11-05')).toBe('5 Nov 2025')
  })

  test('every unevaluable reason', () => {
    expect(describeMissing({ status: 'unevaluable', reason: 'no-values' })).toBe('No values entered yet.')
    expect(
      describeMissing({ status: 'unevaluable', reason: 'year-ago-value-zero', latestPeriod: '2026-03', yearAgoPeriod: '2025-03' }),
    ).toBe("The Mar 2025 value is zero, so growth can't be calculated.")
    expect(describeMissing({ status: 'unevaluable', reason: 'no-prices' })).toBe('No prices entered yet.')
    expect(describeMissing({ status: 'unevaluable', reason: 'no-year-ago-price', yearAgoDate: '2025-11-20' })).toBe(
      'No price within 30 days of 20 Nov 2025.',
    )
  })
})
