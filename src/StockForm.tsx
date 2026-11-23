import { useState } from 'react'
import {
  emptyIndicator,
  MAX_INDICATORS,
  validateStock,
  type Frequency,
  type Stock,
  type StockDraft,
} from './stocks.ts'

interface Props {
  initial: StockDraft
  // The other tracked stocks, for the duplicate-ticker check.
  others: Stock[]
  submitLabel: string
  onSubmit: (draft: StockDraft) => void
  onCancel: () => void
}

export function StockForm({ initial, others, submitLabel, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<StockDraft>(initial)
  const [problems, setProblems] = useState<string[]>([])

  const setIndicator = (index: number, change: Partial<StockDraft['indicators'][number]>) =>
    setDraft((d) => ({
      ...d,
      indicators: d.indicators.map((indicator, i) => (i === index ? { ...indicator, ...change } : indicator)),
    }))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = validateStock(draft, others)
    setProblems(found)
    if (found.length === 0) onSubmit(draft)
  }

  return (
    <form className="stock-form" onSubmit={submit} noValidate>
      <div className="field-row">
        <label>
          Name
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label>
          Ticker
          <input
            value={draft.ticker}
            onChange={(e) => setDraft({ ...draft, ticker: e.target.value })}
            className="ticker-input"
          />
        </label>
      </div>

      <fieldset>
        <legend>Indicators</legend>
        {draft.indicators.map((indicator, i) => (
          <div className="field-row" key={indicator.id ?? `new-${i}`}>
            <label>
              Name
              <input value={indicator.name} onChange={(e) => setIndicator(i, { name: e.target.value })} />
            </label>
            <label>
              Unit
              <input
                value={indicator.unit}
                placeholder="e.g. units sold"
                onChange={(e) => setIndicator(i, { unit: e.target.value })}
              />
            </label>
            <label>
              Published
              <select
                value={indicator.frequency}
                onChange={(e) => setIndicator(i, { frequency: e.target.value as Frequency })}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </label>
            {draft.indicators.length > 1 && (
              <button
                type="button"
                className="link-button"
                onClick={() => setDraft({ ...draft, indicators: draft.indicators.filter((_, j) => j !== i) })}
              >
                Remove indicator
              </button>
            )}
          </div>
        ))}
        {draft.indicators.length < MAX_INDICATORS && (
          <button
            type="button"
            className="link-button"
            onClick={() => setDraft({ ...draft, indicators: [...draft.indicators, emptyIndicator()] })}
          >
            Add a second indicator
          </button>
        )}
      </fieldset>

      {problems.length > 0 && (
        <ul className="problems" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button type="submit">{submitLabel}</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
