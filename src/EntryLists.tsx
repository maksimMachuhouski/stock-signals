import { useState, type ReactNode } from 'react'
import {
  formatNumber,
  formatPeriod,
  priceDraft,
  validatePrice,
  validateValue,
  valueDraft,
  type IndicatorValue,
  type Price,
  type PriceDraft,
  type ValueDraft,
} from './entries.ts'
import type { Frequency, Indicator, Stock } from './stocks.ts'

// Lists of an indicator's values and a stock's prices, newest first, each with add, edit, and delete (R-1, R-3, R-4).

interface ValuesProps {
  indicator: Indicator
  values: IndicatorValue[]
  today: string
  onAdd: (draft: ValueDraft) => void
  onUpdate: (id: string, draft: ValueDraft) => void
  onDelete: (id: string) => void
}

export function IndicatorValues({ indicator, values, today, onAdd, onUpdate, onDelete }: ValuesProps) {
  const sorted = [...values].sort((a, b) => b.period.localeCompare(a.period))
  return (
    <EntryList
      title={`${indicator.name} (${indicator.unit}, ${indicator.frequency})`}
      addLabel="Add a value"
      emptyText="No values yet."
      items={sorted}
      renderItem={(v) => (
        <>
          <span className="entry-key">{formatPeriod(v.period)}</span>
          <span className="entry-number">{formatNumber(v.value)}</span>
          {v.sourceUrl && (
            <a href={v.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          )}
          {v.note && <span className="entry-note">{v.note}</span>}
        </>
      )}
      deleteLabel={(v) => `Delete ${formatPeriod(v.period)}?`}
      renderForm={(item, close) => (
        <ValueForm
          initial={valueDraft(item)}
          frequency={indicator.frequency}
          validate={(draft) => validateValue(draft, indicator.frequency, values.filter((v) => v.id !== item?.id), today)}
          submitLabel={item ? 'Save' : 'Add'}
          onSubmit={(draft) => {
            if (item) onUpdate(item.id, draft)
            else onAdd(draft)
            close()
          }}
          onCancel={close}
        />
      )}
      onDelete={onDelete}
    />
  )
}

interface PricesProps {
  stock: Stock
  prices: Price[]
  today: string
  onAdd: (draft: PriceDraft) => void
  onUpdate: (id: string, draft: PriceDraft) => void
  onDelete: (id: string) => void
}

export function StockPrices({ stock, prices, today, onAdd, onUpdate, onDelete }: PricesProps) {
  const sorted = [...prices].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <EntryList
      title={`${stock.ticker} price`}
      addLabel="Add a price"
      emptyText="No prices yet."
      items={sorted}
      renderItem={(p) => (
        <>
          <span className="entry-key">{p.date}</span>
          <span className="entry-number">{formatNumber(p.price)}</span>
        </>
      )}
      deleteLabel={(p) => `Delete the price for ${p.date}?`}
      renderForm={(item, close) => (
        <PriceForm
          initial={priceDraft(item)}
          today={today}
          validate={(draft) => validatePrice(draft, prices.filter((p) => p.id !== item?.id), today)}
          submitLabel={item ? 'Save' : 'Add'}
          onSubmit={(draft) => {
            if (item) onUpdate(item.id, draft)
            else onAdd(draft)
            close()
          }}
          onCancel={close}
        />
      )}
      onDelete={onDelete}
    />
  )
}

interface ListProps<T extends { id: string }> {
  title: string
  addLabel: string
  emptyText: string
  items: T[]
  renderItem: (item: T) => ReactNode
  deleteLabel: (item: T) => string
  // The form for a new item (undefined) or an existing one; `close` returns to the list.
  renderForm: (item: T | undefined, close: () => void) => ReactNode
  onDelete: (id: string) => void
}

function EntryList<T extends { id: string }>({
  title,
  addLabel,
  emptyText,
  items,
  renderItem,
  deleteLabel,
  renderForm,
  onDelete,
}: ListProps<T>) {
  // 'new', an item's id being edited, or null.
  const [editing, setEditing] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)
  const close = () => setEditing(null)
  const busy = editing !== null || confirmingDelete !== null

  return (
    <section className="entries">
      <div className="entries-head">
        <h3>{title}</h3>
        {editing !== 'new' && (
          <button type="button" className="link-button" onClick={() => setEditing('new')} disabled={busy}>
            {addLabel}
          </button>
        )}
      </div>
      {editing === 'new' && renderForm(undefined, close)}
      {items.length === 0 && editing !== 'new' && <p className="entries-empty">{emptyText}</p>}
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {editing === item.id ? (
              renderForm(item, close)
            ) : (
              <div className="entry">
                {renderItem(item)}
                <span className="entry-actions">
                  {confirmingDelete === item.id ? (
                    <>
                      {deleteLabel(item)}{' '}
                      <button
                        type="button"
                        onClick={() => {
                          onDelete(item.id)
                          setConfirmingDelete(null)
                        }}
                      >
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirmingDelete(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="link-button" onClick={() => setEditing(item.id)} disabled={busy}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => setConfirmingDelete(item.id)}
                        disabled={busy}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

interface FormProps<D> {
  initial: D
  validate: (draft: D) => string[]
  submitLabel: string
  onSubmit: (draft: D) => void
  onCancel: () => void
}

function ValueForm({ frequency, ...props }: FormProps<ValueDraft> & { frequency: Frequency }) {
  return (
    <EntryForm {...props}>
      {(draft, set) => (
        <>
          {frequency === 'monthly' ? (
            <label>
              Month
              <input type="month" value={draft.period} onChange={(e) => set({ period: e.target.value })} />
            </label>
          ) : (
            <QuarterInput period={draft.period} onChange={(period) => set({ period })} />
          )}
          <label>
            Value
            <input inputMode="decimal" value={draft.value} onChange={(e) => set({ value: e.target.value })} />
          </label>
          <label>
            Source (optional)
            <input
              type="url"
              placeholder="https://"
              value={draft.sourceUrl}
              onChange={(e) => set({ sourceUrl: e.target.value })}
            />
          </label>
          <label>
            Note (optional)
            <input value={draft.note} onChange={(e) => set({ note: e.target.value })} />
          </label>
        </>
      )}
    </EntryForm>
  )
}

function PriceForm({ today, ...props }: FormProps<PriceDraft> & { today: string }) {
  return (
    <EntryForm {...props}>
      {(draft, set) => (
        <>
          <label>
            Date
            <input type="date" max={today} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <label>
            Price
            <input inputMode="decimal" value={draft.price} onChange={(e) => set({ price: e.target.value })} />
          </label>
        </>
      )}
    </EntryForm>
  )
}

// A year and a quarter, combined into 'YYYY-Qn'; either part left empty gives ''.
function QuarterInput({ period, onChange }: { period: string; onChange: (period: string) => void }) {
  const match = /^(\d{4})-Q([1-4])$/.exec(period)
  const [year, setYear] = useState(match?.[1] ?? '')
  const [quarter, setQuarter] = useState(match?.[2] ?? '')
  const update = (y: string, q: string) => {
    setYear(y)
    setQuarter(q)
    onChange(/^\d{4}$/.test(y) && q ? `${y}-Q${q}` : '')
  }
  return (
    <>
      <label>
        Year
        <input
          className="year-input"
          inputMode="numeric"
          value={year}
          onChange={(e) => update(e.target.value.trim(), quarter)}
        />
      </label>
      <label>
        Quarter
        <select value={quarter} onChange={(e) => update(year, e.target.value)}>
          <option value="">–</option>
          <option value="1">Q1</option>
          <option value="2">Q2</option>
          <option value="3">Q3</option>
          <option value="4">Q4</option>
        </select>
      </label>
    </>
  )
}

function EntryForm<D>({
  initial,
  validate,
  submitLabel,
  onSubmit,
  onCancel,
  children,
}: FormProps<D> & { children: (draft: D, set: (change: Partial<D>) => void) => ReactNode }) {
  const [draft, setDraft] = useState<D>(initial)
  const [problems, setProblems] = useState<string[]>([])
  return (
    <form
      className="entry-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        const found = validate(draft)
        setProblems(found)
        if (found.length === 0) onSubmit(draft)
      }}
    >
      <div className="field-row">
        {children(draft, (change) => setDraft((d) => ({ ...d, ...change })))}
        <button type="submit">{submitLabel}</button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {problems.length > 0 && (
        <ul className="problems" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </form>
  )
}
