import { useEffect, useState } from 'react'
import { StockForm } from './StockForm.tsx'
import { loadData, saveData, type AppData } from './storage.ts'
import { emptyIndicator, toDraft, toStock, type Stock } from './stocks.ts'

const browserStorage = typeof localStorage === 'undefined' ? undefined : localStorage

// What the stock section shows: the list, the add form, or one stock's edit form.
type Mode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; stockId: string }

export function App({ initialData }: { initialData?: AppData }) {
  const [data, setData] = useState<AppData>(() => initialData ?? loadData(browserStorage))
  const [mode, setMode] = useState<Mode>({ kind: 'list' })
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null)

  useEffect(() => saveData(browserStorage, data), [data])

  const setStocks = (update: (stocks: Stock[]) => Stock[]) => setData((d) => ({ ...d, stocks: update(d.stocks) }))
  const busy = mode.kind !== 'list' || confirmingRemoval !== null

  return (
    <main>
      <h1>Stock signals</h1>

      {mode.kind === 'add' ? (
        <section>
          <h2>Add a stock</h2>
          <StockForm
            initial={{ name: '', ticker: '', indicators: [emptyIndicator()] }}
            others={data.stocks}
            submitLabel="Add stock"
            onSubmit={(draft) => {
              setStocks((stocks) => [...stocks, toStock(draft)])
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
                  submitLabel="Save"
                  onSubmit={(draft) => {
                    setStocks((stocks) => stocks.map((s) => (s.id === stock.id ? toStock(draft, stock.id) : s)))
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
                        Remove {stock.ticker}?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setStocks((stocks) => stocks.filter((s) => s.id !== stock.id))
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
                <ul className="indicators">
                  {stock.indicators.map((indicator) => (
                    <li key={indicator.id}>
                      {`${indicator.name} (${indicator.unit}, ${indicator.frequency})`}
                    </li>
                  ))}
                </ul>
              </li>
            ),
          )}
        </ul>
      )}
    </main>
  )
}
