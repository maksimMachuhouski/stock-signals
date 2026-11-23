import { describe, expect, test } from 'vitest'
import {
  formatPeriod,
  parseNumber,
  periodStart,
  toValue,
  validatePrice,
  validateValue,
  type IndicatorValue,
  type Price,
  type ValueDraft,
} from './entries.ts'

const today = '2026-11-23'
const value = (change: Partial<ValueDraft> = {}): ValueDraft => ({
  period: '2026-Q3',
  value: '100',
  sourceUrl: '',
  note: '',
  ...change,
})

describe('periods', () => {
  test('start dates and labels', () => {
    expect(periodStart('2026-Q1')).toBe('2026-01-01')
    expect(periodStart('2026-Q4')).toBe('2026-10-01')
    expect(periodStart('2026-03')).toBe('2026-03-01')
    expect(formatPeriod('2026-Q2')).toBe('Q2 2026')
    expect(formatPeriod('2026-03')).toBe('Mar 2026')
  })
})

describe('parseNumber', () => {
  test('accepts decimals and thousands separators', () => {
    expect(parseNumber(' 1,234.5 ')).toBe(1234.5)
    expect(parseNumber('0')).toBe(0)
    expect(parseNumber('-3')).toBe(-3)
    expect(parseNumber('.5')).toBe(0.5)
  })

  test('refuses anything else', () => {
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
    expect(parseNumber('1.2.3')).toBeNull()
    expect(parseNumber('1e5')).toBeNull()
  })
})

describe('validateValue', () => {
  test('a value for a past or current period is valid, zero included', () => {
    expect(validateValue(value(), 'quarterly', [], today)).toEqual([])
    expect(validateValue(value({ period: '2026-Q4', value: '0' }), 'quarterly', [], today)).toEqual([])
    expect(validateValue(value({ period: '2026-11' }), 'monthly', [], today)).toEqual([])
  })

  test('a negative value is refused', () => {
    expect(validateValue(value({ value: '-0.1' }), 'quarterly', [], today)).toEqual([
      "An indicator value can't be negative.",
    ])
  })

  test('a value that is not a number is refused', () => {
    expect(validateValue(value({ value: 'ten' }), 'quarterly', [], today)).toEqual(['Enter the value as a number.'])
  })

  test('a future period is refused', () => {
    expect(validateValue(value({ period: '2027-Q1' }), 'quarterly', [], today)).toEqual([
      "The period can't be in the future.",
    ])
    expect(validateValue(value({ period: '2026-12' }), 'monthly', [], today)).toEqual([
      "The period can't be in the future.",
    ])
  })

  test("a period that doesn't match the indicator's frequency is refused", () => {
    expect(validateValue(value({ period: '2026-03' }), 'quarterly', [], today)).toEqual([
      'Choose the year and quarter.',
    ])
    expect(validateValue(value({ period: '' }), 'monthly', [], today)).toEqual(['Choose the month.'])
  })

  test('a second value for the same period is refused', () => {
    const existing: IndicatorValue[] = [{ id: 'v1', indicatorId: 'i1', period: '2026-Q3', value: 90 }]
    expect(validateValue(value(), 'quarterly', existing, today)).toEqual([
      'There is already a value for Q3 2026; edit that one instead.',
    ])
  })

  test('a source that is not a web address is refused', () => {
    expect(validateValue(value({ sourceUrl: 'ir.tesla.com' }), 'quarterly', [], today)).toEqual([
      'The source must be a web address starting with http:// or https://.',
    ])
    expect(validateValue(value({ sourceUrl: 'https://ir.tesla.com' }), 'quarterly', [], today)).toEqual([])
  })

  test('the source and note are optional and kept when given', () => {
    expect(toValue(value(), 'i1', 'v1')).toEqual({ id: 'v1', indicatorId: 'i1', period: '2026-Q3', value: 100 })
    expect(toValue(value({ sourceUrl: ' https://x.com ', note: ' record ' }), 'i1', 'v1')).toMatchObject({
      sourceUrl: 'https://x.com',
      note: 'record',
    })
  })
})

describe('validatePrice', () => {
  const existing: Price[] = [{ id: 'p1', stockId: 's1', date: '2026-11-20', price: 250 }]

  test('a positive price for today or earlier is valid', () => {
    expect(validatePrice({ date: today, price: '0.01' }, existing, today)).toEqual([])
  })

  test('zero or negative prices are refused', () => {
    expect(validatePrice({ date: today, price: '0' }, [], today)).toEqual(['A price must be greater than zero.'])
    expect(validatePrice({ date: today, price: '-5' }, [], today)).toEqual(['A price must be greater than zero.'])
  })

  test('a future or invalid date is refused', () => {
    expect(validatePrice({ date: '2026-11-24', price: '1' }, [], today)).toEqual(["The date can't be in the future."])
    expect(validatePrice({ date: '2026-02-30', price: '1' }, [], today)).toEqual(['Choose the date.'])
  })

  test('a second price on the same date is refused', () => {
    expect(validatePrice({ date: '2026-11-20', price: '1' }, existing, today)).toEqual([
      'There is already a price for 2026-11-20; edit that one instead.',
    ])
  })
})
