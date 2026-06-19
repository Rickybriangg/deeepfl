'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { formatKES } from '@/lib/format'

const REQUIRED_FIELDS = [
  'loanNo',
  'borrowerName',
  'approvedAmount',
  'disbursedAmount',
  'totalPaid',
  'outstandingBalance',
  'daysInArrears',
  'classification',
] as const

const OPTIONAL_FIELDS = [
  'memberNo',
  'disbursementDate',
  'repaymentStartDate',
  'expectedCompletionDate',
  'lastPayDate',
  'loanTenor',
  'countyCode',
] as const

const PRODUCTS = [
  'Agribizz',
  'Asset Finance',
  'Vuka',
  'Go Green',
  'LPO/LSO',
  'Migration',
  'Talanta',
  'VIBE',
  'Group Loan',
]

type Mapping = Record<string, string>

interface ImportResult {
  importBatchId: string
  rowCount: number
  insertedCount: number
  skippedDuplicates: number
  droppedRowCount: number
  dropReport: { sheet: string; dropped: number; reasons: string[] }[]
  reconciliation: {
    product: string
    subledgerDisbursed: string
    subledgerOutstanding: string
    controlDisbursed: string | null
    controlOutstanding: string | null
    disbursedDiff: string | null
    outstandingDiff: string | null
    reconciled: boolean
  }[]
  reconciliationStatus: string
  dataQuality: {
    totalRows: number
    totalDropped: number
    creditBalances: number
    neverPaid: number
    matured: number
    missingDates: number
    missingClassification: number
  }
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [headersBySheet, setHeadersBySheet] = useState<Record<string, string[]>>({})
  const [mappings, setMappings] = useState<Record<string, Mapping>>({})
  const [products, setProducts] = useState<Record<string, string>>({})
  const [fileBase64, setFileBase64] = useState<string>('')
  const [step, setStep] = useState<'upload' | 'map' | 'result'>('upload')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)

  async function handleFile(f: File) {
    setFile(f)
    setError('')
    const buffer = await f.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const names = wb.SheetNames
    const headers: Record<string, string[]> = {}
    const initMappings: Record<string, Mapping> = {}
    const initProducts: Record<string, string> = {}

    for (const name of names) {
      const sheet = wb.Sheets[name]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: null }) as Record<
        string,
        unknown
      >[]
      headers[name] = json.length > 0 ? Object.keys(json[0]) : []
      initMappings[name] = {}
      // Guess product by sheet name
      const guess = PRODUCTS.find((p) =>
        name.toLowerCase().includes(p.toLowerCase().split(' ')[0].toLowerCase())
      )
      initProducts[name] = guess ?? PRODUCTS[0]
    }

    setSheetNames(names)
    setHeadersBySheet(headers)
    setMappings(initMappings)
    setProducts(initProducts)

    // base64 encode for submission
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    setFileBase64(btoa(binary))

    setStep('map')
  }

  function updateMapping(sheet: string, field: string, column: string) {
    setMappings((prev) => ({
      ...prev,
      [sheet]: { ...prev[sheet], [field]: column },
    }))
  }

  function isSheetReady(sheet: string): boolean {
    const m = mappings[sheet] ?? {}
    return REQUIRED_FIELDS.every((f) => !!m[f])
  }

  async function handleSubmit() {
    if (!file) return
    setLoading(true)
    setError('')

    const sheetMappings: Record<string, Mapping> = {}
    for (const sheet of sheetNames) {
      if (isSheetReady(sheet)) sheetMappings[sheet] = mappings[sheet]
    }

    if (Object.keys(sheetMappings).length === 0) {
      setError('Map at least one sheet with all required fields before importing.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileBase64,
          sheetMappings,
          sheetProducts: products,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ? JSON.stringify(data.error) : 'Import failed.')
        setLoading(false)
        return
      }
      setResult(data)
      setStep('result')
    } catch {
      setError('Network error during import.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Loan Book</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Upload .xlsx / .csv, map columns, and review reconciliation before going live.
        </p>
      </div>

      {step === 'upload' && (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block mx-auto text-sm"
          />
          <p className="text-xs text-gray-400 mt-4">
            Accepted formats: .xlsx, .xls, .csv. Each sheet should represent one product.
          </p>
        </div>
      )}

      {step === 'map' && (
        <div className="space-y-6">
          {sheetNames.map((sheet) => (
            <div key={sheet} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{sheet}</h3>
                <select
                  value={products[sheet]}
                  onChange={(e) =>
                    setProducts((p) => ({ ...p, [sheet]: e.target.value }))
                  }
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                >
                  {PRODUCTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {field}
                      {(REQUIRED_FIELDS as readonly string[]).includes(field) && (
                        <span className="text-red-500"> *</span>
                      )}
                    </label>
                    <select
                      value={mappings[sheet]?.[field] ?? ''}
                      onChange={(e) => updateMapping(sheet, field, e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5"
                    >
                      <option value="">— not mapped —</option>
                      {(headersBySheet[sheet] ?? []).map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <p
                className={`text-xs mt-3 ${
                  isSheetReady(sheet) ? 'text-green-600' : 'text-amber-600'
                }`}
              >
                {isSheetReady(sheet)
                  ? '✓ Ready to import'
                  : 'Map all required fields (*) to include this sheet'}
              </p>
            </div>
          ))}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Importing…' : 'Run Import'}
            </button>
            <button
              onClick={() => setStep('upload')}
              className="text-gray-600 hover:text-gray-800 text-sm px-5 py-2.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              label="New rows inserted"
              value={(result.insertedCount ?? result.rowCount).toString()}
              good={(result.insertedCount ?? result.rowCount) > 0}
            />
            <SummaryCard
              label="Duplicates skipped"
              value={(result.skippedDuplicates ?? 0).toString()}
              warn={(result.skippedDuplicates ?? 0) > 0}
            />
            <SummaryCard
              label="Rows dropped"
              value={result.droppedRowCount.toString()}
              warn={result.droppedRowCount > 0}
            />
            <SummaryCard
              label="Reconciliation"
              value={result.reconciliationStatus}
              warn={result.reconciliationStatus === 'Failed'}
              good={result.reconciliationStatus === 'Reconciled'}
            />
            <SummaryCard
              label="Credit balances"
              value={result.dataQuality.creditBalances.toString()}
              warn={result.dataQuality.creditBalances > 0}
            />
          </div>

          {/* Data quality */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Data Quality Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <Stat label="Never paid" value={result.dataQuality.neverPaid} />
              <Stat label="Matured & owing" value={result.dataQuality.matured} />
              <Stat label="Missing dates" value={result.dataQuality.missingDates} />
              <Stat
                label="Missing classification"
                value={result.dataQuality.missingClassification}
              />
              <Stat label="Credit balances" value={result.dataQuality.creditBalances} />
            </div>
          </div>

          {/* Dropped rows */}
          {result.dropReport.some((d) => d.dropped > 0) && (
            <div className="bg-white rounded-xl border border-amber-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Dropped Rows (by sheet)</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1.5 pr-4">Sheet</th>
                    <th className="py-1.5">Dropped</th>
                  </tr>
                </thead>
                <tbody>
                  {result.dropReport
                    .filter((d) => d.dropped > 0)
                    .map((d) => (
                      <tr key={d.sheet} className="border-b border-gray-100">
                        <td className="py-1.5 pr-4">{d.sheet}</td>
                        <td className="py-1.5">{d.dropped}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reconciliation table */}
          {result.reconciliation.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">
                Subledger vs Control Reconciliation
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1.5 pr-4">Product</th>
                    <th className="py-1.5 pr-4">Subledger Outstanding</th>
                    <th className="py-1.5 pr-4">Control Outstanding</th>
                    <th className="py-1.5 pr-4">Diff</th>
                    <th className="py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.reconciliation.map((r) => (
                    <tr key={r.product} className="border-b border-gray-100">
                      <td className="py-1.5 pr-4">{r.product}</td>
                      <td className="py-1.5 pr-4">
                        {formatKES(r.subledgerOutstanding)}
                      </td>
                      <td className="py-1.5 pr-4">
                        {r.controlOutstanding ? formatKES(r.controlOutstanding) : '—'}
                      </td>
                      <td className="py-1.5 pr-4">
                        {r.outstandingDiff ? formatKES(r.outstandingDiff) : '—'}
                      </td>
                      <td className="py-1.5">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            r.reconciled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {r.reconciled ? 'Reconciled' : 'Off'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            onClick={() => {
              setStep('upload')
              setResult(null)
              setFile(null)
            }}
            className="text-blue-700 hover:text-blue-800 text-sm font-medium"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  warn,
  good,
}: {
  label: string
  value: string
  warn?: boolean
  good?: boolean
}) {
  return (
    <div
      className={`bg-white rounded-xl border-l-4 p-4 shadow-sm ${
        good ? 'border-green-500' : warn ? 'border-amber-500' : 'border-blue-500'
      }`}
    >
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className="font-semibold text-gray-900">{value}</p>
    </div>
  )
}
