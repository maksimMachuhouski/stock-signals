import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'
import { App } from './App.tsx'
import { emptyData } from './storage.ts'

test('the app renders its title and an empty list', () => {
  const html = renderToString(<App initialData={emptyData()} />)
  expect(html).toContain('Stock signals')
  expect(html).toContain('No stocks are tracked yet.')
})

test('tracked stocks are listed with their indicators, values, and prices', () => {
  const html = renderToString(
    <App
      today="2026-11-23"
      initialData={{
        version: 1,
        stocks: [
          {
            id: 's1',
            name: 'Tesla',
            ticker: 'TSLA',
            indicators: [
              { id: 'i1', name: 'Deliveries', unit: 'vehicles', frequency: 'quarterly' },
              { id: 'i2', name: 'Energy storage', unit: 'GWh', frequency: 'monthly' },
            ],
          },
        ],
        values: [{ id: 'v1', indicatorId: 'i1', period: '2026-Q3', value: 497099, note: 'record' }],
        prices: [{ id: 'p1', stockId: 's1', date: '2026-11-20', price: 250.5 }],
        threshold: 10,
      }}
    />,
  )
  expect(html).toContain('TSLA')
  expect(html).toContain('Deliveries (vehicles, quarterly)')
  expect(html).toContain('Energy storage (GWh, monthly)')
  expect(html).toContain('Q3 2026')
  expect(html).toContain('record')
  expect(html).toContain('2026-11-20')
  expect(html).toContain('No values yet.')
  expect(html).not.toContain('No stocks are tracked yet.')
})
