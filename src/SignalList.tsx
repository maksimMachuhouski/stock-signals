import { useState } from 'react'
import { analyzeStock } from './analysis.ts'
import { describeMissing, formatDate, isFlagged, oneDecimal, signedPercent } from './display.ts'
import { formatPeriod, parseNumber } from './entries.ts'
import type { AppData } from './storage.ts'

// The signal list (R-10, R-11): one group per stock, flagged stocks first, each indicator a row with its
// growth, the price change, and the gap against the threshold, or why it can't be evaluated.
export function SignalList({ data, onThreshold }: { data: AppData; onThreshold: (threshold: number) => void }) {
  const results = data.stocks.map((stock) => analyzeStock(data, stock))
  // Flagged first; otherwise the order the stocks were added in.
  const ordered = [...results.filter((r) => r.flagged), ...results.filter((r) => !r.flagged)]

  return (
    <section className="signals">
      <ThresholdInput threshold={data.threshold} onChange={onThreshold} />
      {ordered.length === 0 ? (
        <p>No stocks are tracked yet.</p>
      ) : (
        <ul className="signal-list">
          {ordered.map(({ stock, indicators, flagged }) => (
            <li key={stock.id} className={`signal-stock${flagged ? ' flagged' : ''}`}>
              <div className="signal-head">
                <strong>{stock.ticker}</strong> {stock.name}
                {flagged && <span className="flag">Flagged</span>}
              </div>
              <ul>
                {indicators.map(({ indicator, result }) => (
                  <li key={indicator.id} className={`signal-row${isFlagged(result) ? ' flagged' : ''}`}>
                    <span className="signal-indicator">{indicator.name}</span>
                    {result.status === 'evaluated' ? (
                      <>
                        <span>
                          {`Indicator ${signedPercent(result.indicatorGrowth)}`}
                          <small>{` ${formatPeriod(result.yearAgoPeriod)} → ${formatPeriod(result.latestPeriod)}`}</small>
                        </span>
                        <span>
                          {`Price ${signedPercent(result.priceChange)}`}
                          <small>{` ${formatDate(result.yearAgoPrice.date)} → ${formatDate(result.latestPrice.date)}`}</small>
                        </span>
                        <span className="signal-gap">
                          {`Gap ${oneDecimal(result.gap)} pp ${result.flagged ? '≥' : '<'} ${oneDecimal(data.threshold)}`}
                        </span>
                        {result.flagged && <span className="flag">Flagged</span>}
                      </>
                    ) : (
                      <span className="signal-missing">{describeMissing(result)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Changes the threshold as it's typed; flags follow at once. Something that isn't a number is not applied.
function ThresholdInput({ threshold, onChange }: { threshold: number; onChange: (threshold: number) => void }) {
  const [text, setText] = useState(String(threshold))
  const parsed = parseNumber(text)
  const invalid = parsed === null || parsed < 0
  return (
    <div className="threshold">
      <label>
        Flag when the gap is at least{' '}
        <input
          className="threshold-input"
          inputMode="decimal"
          value={text}
          aria-invalid={invalid}
          onChange={(e) => {
            setText(e.target.value)
            const value = parseNumber(e.target.value)
            if (value !== null && value >= 0) onChange(value)
          }}
        />{' '}
        percentage points
      </label>
      {invalid && <span className="problems">{` Enter a number, 0 or more; ${oneDecimal(threshold)} is still used.`}</span>}
    </div>
  )
}
