import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'
import { App } from './App.tsx'

test('the app renders its title', () => {
  expect(renderToString(<App />)).toContain('Stock signals')
})
