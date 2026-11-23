import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'
import { App } from './App.tsx'
import { emptyData } from './storage.ts'

test('the app renders its title and an empty list', () => {
  const html = renderToString(<App initialData={emptyData()} />)
  expect(html).toContain('Stock signals')
  expect(html).toContain('No stocks are tracked yet.')
})

test('tracked stocks are listed with their indicators', () => {
  const html = renderToString(
    <App
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
      }}
    />,
  )
  expect(html).toContain('TSLA')
  expect(html).toContain('Deliveries (vehicles, quarterly)')
  expect(html).toContain('Energy storage (GWh, monthly)')
  expect(html).not.toContain('No stocks are tracked yet.')
})
