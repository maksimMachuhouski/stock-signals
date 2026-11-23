import { useEffect, useState } from 'react'
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
  // Values recorded per indicator id. An indicator with values keeps its frequency, since the values' periods
  // depend on it, and saving without it asks first, saying how many values go with it (R-5).
  valueCounts?: Map<string, number>
  submitLabel: string
  onSubmit: (draft: StockDraft) => void
  onCancel: () => void
}

export function StockForm({ initial, others, valueCounts, submitLabel, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<StockDraft>(initial)
  const [problems, setProblems] = useState<string[]>([])
  // Set when a valid save would delete values: what to tell the user before going ahead.
  const [confirming, setConfirming] = useState<string | null>(null)
  // Any change after the question was asked makes it stale; the next save asks again.
  useEffect(() => setConfirming(null), [draft])
  const hasValues = (id: string | undefined) => id !== undefined && (valueCounts?.get(id) ?? 0) > 0

  const setIndicator = (index: number, change: Partial<StockDraft['indicators'][number]>) =>
    setDraft((d) => ({
      ...d,
      indicators: d.indicators.map((indicator, i) => (i === index ? { ...indicator, ...change } : indicator)),
    }))

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = validateStock(draft, others)
    setProblems(found)
    if (found.length > 0) return
    const kept = new Set(draft.indicators.map((i) => i.id))
    const dropped = initial.indicators.filter((i) => !kept.has(i.id) && hasValues(i.id))
    if (dropped.length === 0) onSubmit(draft)
    else setConfirming(dropped.map((i) => removalText(i.name, valueCounts?.get(i.id!) ?? 0)).join(' '))
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
                disabled={hasValues(indicator.id)}
                title={
                  hasValues(indicator.id)
                    ? "Values are entered for this indicator's periods, so this can't change."
                    : undefined
                }
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

      {confirming ? (
        <div className="actions confirm" role="alert">
          {confirming}
          <button type="button" onClick={() => onSubmit(draft)}>
            Save and delete
          </button>
          <button type="button" onClick={() => setConfirming(null)}>
            Back
          </button>
        </div>
      ) : (
        <div className="actions">
          <button type="submit">{submitLabel}</button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}
    </form>
  )
}

export function removalText(indicatorName: string, values: number): string {
  return `Saving removes ${indicatorName} and deletes its ${values} ${values === 1 ? 'value' : 'values'}.`
}
