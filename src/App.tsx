import { useEffect, useState } from 'react'
import { IndicatorValues, StockPrices } from './EntryLists.tsx'
import { SignalList } from './SignalList.tsx'
import { toPrice, todayISO, toValue } from './entries.ts'
import { StockForm } from './StockForm.tsx'
import {
  countStockData,
  describeCount,
  loadData,
  removeStock,
  replaceStock,
  saveData,
  type AppData,
} from './storage.ts'
import { emptyIndicator, toDraft, toStock } from './stocks.ts'

const browserStorage = typeof localStorage === 'undefined' ? undefined : localStorage

// What the stock section shows: the list, the add form, or one stock's edit form.
type Mode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; stockId: string }

// Signals: the list of results (T-6). Data: stocks, values, and prices.
type Tab = 'signals' | 'data'

export function App({
  initialData,
  initialTab = 'signals',
  today = todayISO(),
}: {
  initialData?: AppData
  initialTab?: Tab
  today?: string
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [data, setData] = useState<AppData>(() => initialData ?? loadData(browserStorage))
  const [mode, setMode] = useState<Mode>({ kind: 'list' })
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null)

  useEffect(() => saveData(browserStorage, data), [data])

  const busy = mode.kind !== 'list' || confirmingRemoval !== null

  return (
    <main>
      <h1>Stock signals</h1>
      <nav className="tabs">
        {(['signals', 'data'] as const).map((t) => (
          <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === 'signals' ? 'Signals' : 'Data'}
          </button>
        ))}
      </nav>

      {tab === 'signals' ? (
        <SignalList data={data} onThreshold={(threshold) => setData((d) => ({ ...d, threshold }))} />
      ) : (
        <>
          {mode.kind === 'add' ? (
            <section>
              <h2>Add a stock</h2>
              <StockForm
                initial={{ name: '', ticker: '', indicators: [emptyIndicator()] }}
                others={data.stocks}
                submitLabel="Add stock"
                onSubmit={(draft) => {
                  setData((d) => ({ ...d, stocks: [...d.stocks, toStock(draft)] }))
                  setMode({ kind: 'list' })
                }}
                onCancel={() => setMode({ kind: 'list' })}
              />
            </section>
          ) : (
            <button type="button" onClick={() => setMode({ kind: 'add' })} disabled={busy}>
              Add a stock
            </button>
          )}

          {data.stocks.length === 0 ? (
            <p>No stocks are tracked yet.</p>
          ) : (
            <ul className="stock-list">
              {data.stocks.map((stock) =>
                mode.kind === 'edit' && mode.stockId === stock.id ? (
                  <li key={stock.id} className="stock">
                    <StockForm
                      initial={toDraft(stock)}
                      others={data.stocks.filter((s) => s.id !== stock.id)}
                      valueCounts={valueCounts(data)}
                      submitLabel="Save"
                      onSubmit={(draft) => {
                        setData((d) => replaceStock(d, toStock(draft, stock.id)))
                        setMode({ kind: 'list' })
                      }}
                      onCancel={() => setMode({ kind: 'list' })}
                    />
                  </li>
                ) : (
                  <li key={stock.id} className="stock">
                    <div className="stock-head">
                      <strong>{stock.ticker}</strong> {stock.name}
                      <span className="stock-actions">
                        {confirmingRemoval === stock.id ? (
                          <>
                            {removalQuestion(stock.ticker, describeCount(countStockData(data, stock.id)))}{' '}
                            <button
                              type="button"
                              onClick={() => {
                                setData((d) => removeStock(d, stock.id))
                                setConfirmingRemoval(null)
                              }}
                            >
                              Remove
                            </button>
                            <button type="button" onClick={() => setConfirmingRemoval(null)}>
                              Keep
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => setMode({ kind: 'edit', stockId: stock.id })}
                              disabled={busy}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="link-button"
                              onClick={() => setConfirmingRemoval(stock.id)}
                              disabled={busy}
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                    {stock.indicators.map((indicator) => (
                      <IndicatorValues
                        key={indicator.id}
                        indicator={indicator}
                        values={data.values.filter((v) => v.indicatorId === indicator.id)}
                        today={today}
                        onAdd={(draft) =>
                          setData((d) => ({ ...d, values: [...d.values, toValue(draft, indicator.id)] }))
                        }
                        onUpdate={(id, draft) =>
                          setData((d) => ({
                            ...d,
                            values: d.values.map((v) => (v.id === id ? toValue(draft, indicator.id, id) : v)),
                          }))
                        }
                        onDelete={(id) => setData((d) => ({ ...d, values: d.values.filter((v) => v.id !== id) }))}
                      />
                    ))}
                    <StockPrices
                      stock={stock}
                      prices={data.prices.filter((p) => p.stockId === stock.id)}
                      today={today}
                      onAdd={(draft) => setData((d) => ({ ...d, prices: [...d.prices, toPrice(draft, stock.id)] }))}
                      onUpdate={(id, draft) =>
                        setData((d) => ({
                          ...d,
                          prices: d.prices.map((p) => (p.id === id ? toPrice(draft, stock.id, id) : p)),
                        }))
                      }
                      onDelete={(id) => setData((d) => ({ ...d, prices: d.prices.filter((p) => p.id !== id) }))}
                    />
                  </li>
                ),
              )}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

// Values per indicator, so the edit form can lock frequencies and say what removing an indicator deletes.
function valueCounts(data: AppData): Map<string, number> {
  const counts = new Map<string, number>()
  for (const v of data.values) counts.set(v.indicatorId, (counts.get(v.indicatorId) ?? 0) + 1)
  return counts
}

function removalQuestion(ticker: string, deleted: string): string {
  return deleted ? `Remove ${ticker} and delete its ${deleted}?` : `Remove ${ticker}? It has no values or prices.`
}
