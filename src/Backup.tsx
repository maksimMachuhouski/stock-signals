import { useState } from 'react'
import { describeData, exportBackup, parseBackup } from './backup.ts'
import { formatDate } from './display.ts'
import type { AppData } from './storage.ts'

// Export to a file and import from one (R-15). An import replaces everything, so it asks first;
// a file that isn't a valid export is refused and nothing changes.
export function Backup({
  data,
  today,
  disabled,
  onReplace,
}: {
  data: AppData
  today: string
  disabled: boolean
  onReplace: (data: AppData) => void
}) {
  const [pending, setPending] = useState<{ data: AppData; exportedAt: string; fileName: string } | null>(null)
  const [problems, setProblems] = useState<{ fileName: string; list: string[] } | null>(null)
  const [done, setDone] = useState('')

  function download() {
    const { fileName, text } = exportBackup(data)
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
    setDone(`Exported ${describeData(data)} to ${fileName}.`)
  }

  async function choose(file: File) {
    setDone('')
    setPending(null)
    setProblems(null)
    const result = parseBackup(await file.text(), today)
    if (result.ok) setPending({ data: result.data, exportedAt: result.exportedAt, fileName: file.name })
    else setProblems({ fileName: file.name, list: result.problems })
  }

  return (
    <section className="backup">
      <h2>Backup</h2>
      <div className="backup-actions">
        <button type="button" onClick={download} disabled={disabled || pending !== null}>
          Export to a file
        </button>
        <label className={`file-button${disabled || pending ? ' disabled' : ''}`}>
          Import from a file…
          <input
            type="file"
            accept="application/json,.json"
            disabled={disabled || pending !== null}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) void choose(file)
            }}
          />
        </label>
      </div>

      {pending && (
        <p className="confirm">
          {`Replace all current data (${describeData(data)}, threshold ${data.threshold}) with ${pending.fileName} (${describeData(pending.data)}, threshold ${pending.data.threshold}${pending.exportedAt ? `, exported ${formatDate(pending.exportedAt.slice(0, 10))}` : ''})? This can't be undone.`}{' '}
          <button
            type="button"
            onClick={() => {
              onReplace(pending.data)
              setDone(`Imported ${pending.fileName}.`)
              setPending(null)
            }}
          >
            Replace
          </button>
          <button type="button" onClick={() => setPending(null)}>
            Cancel
          </button>
        </p>
      )}

      {problems && (
        <div className="problems" role="alert">
          {`${problems.fileName} was not imported; your data is unchanged.`}
          <ul>
            {problems.list.slice(0, 10).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
            {problems.list.length > 10 && <li>{`…and ${problems.list.length - 10} more.`}</li>}
          </ul>
        </div>
      )}

      {done && <p className="done">{done}</p>}
    </section>
  )
}
