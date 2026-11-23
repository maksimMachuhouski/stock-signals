import { roundHalfUp1, type IndicatorResult, type Unevaluable } from './analysis.ts'
import { formatPeriod } from './entries.ts'

// How results read on the signal list: every number to one decimal place (D-4), rounded half up (D-5).

// "10.0", "−5.0" (a true minus sign, as in the percentages)
export function oneDecimal(x: number): string {
  const rounded = roundHalfUp1(x)
  return `${rounded < 0 ? '−' : ''}${Math.abs(rounded).toFixed(1)}`
}

// "+20.0%", "−5.0%", "0.0%"
export function signedPercent(x: number): string {
  const rounded = roundHalfUp1(x)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${Math.abs(rounded).toFixed(1)}%`
}

// "20 Nov 2025"
export function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${day} ${months[month - 1]} ${year}`
}

// Why an indicator can't be evaluated, in words (R-8, R-11).
export function describeMissing(result: Unevaluable): string {
  const latest = result.latestPeriod ? formatPeriod(result.latestPeriod) : ''
  const yearAgo = result.yearAgoPeriod ? formatPeriod(result.yearAgoPeriod) : ''
  switch (result.reason) {
    case 'no-values':
      return 'No values entered yet.'
    case 'no-year-ago-value':
      return `No value for ${yearAgo} to compare ${latest} with.`
    case 'year-ago-value-zero':
      return `The ${yearAgo} value is zero, so growth can't be calculated.`
    case 'no-prices':
      return 'No prices entered yet.'
    case 'no-year-ago-price':
      return `No price within 30 days of ${formatDate(result.yearAgoDate!)}.`
  }
}

export function isFlagged(result: IndicatorResult): boolean {
  return result.status === 'evaluated' && result.flagged
}
