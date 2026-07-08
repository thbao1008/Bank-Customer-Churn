import { useEffect, useState, type FormEvent } from 'react'
import DashboardView from './components/DashboardView'
import HistoryView from './components/HistoryView'
import PredictCsvView from './components/PredictCsvView'
import PredictSingleView from './components/PredictSingleView'
import { buildPredictionResult, fieldLabels, initialCustomer } from './constants'
import type { CustomerData, PredictionResult, SavedPrediction, ResultTab, ViewMode } from './types'

function App() {
  const [view, setView] = useState<ViewMode>('predict-single')
  const [predictInput, setPredictInput] = useState<CustomerData>(initialCustomer)
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null)
  const [savedPredictions, setSavedPredictions] = useState<SavedPrediction[]>([])
  const [saveName, setSaveName] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [singlePanelMode, setSinglePanelMode] = useState<ResultTab | null>(null)
  const [singleResultTab, setSingleResultTab] = useState<ResultTab>('detail')
  const [totalPredictions, setTotalPredictions] = useState(0)
  const [predictionSource, setPredictionSource] = useState<'single' | 'csv' | null>(null)
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null)

  const fetchPredictionHistory = async () => {
    try {
      const res = await fetch('/api/predictions/history')
      const json = await res.json()
      if (res.ok && Array.isArray(json.data)) {
        const mapped: SavedPrediction[] = json.data.map((item: any) => {
          const predictions = Array.isArray(item.predictions) ? item.predictions : []
          const source = item.source || (predictions.length > 1 ? 'csv' : 'single')
          const sessionId = String(item.session_id ?? item.session_name ?? item.created_at ?? `session-${Date.now()}`)
          return {
            id: sessionId,
            session_id: String(item.session_id ?? sessionId),
            name: String(item.session_name ?? item.name ?? `Phiên ${item.created_at}`),
            source,
            result:
              source === 'single' && predictions[0]
                ? {
                    customer_id: Number(predictions[0].customer_id),
                    surname: String(predictions[0].surname ?? ''),
                    geography: String(predictions[0].geography ?? ''),
                    prediction_result: String(predictions[0].prediction_result ?? ''),
                    probability: Number(predictions[0].probability ?? 0),
                  }
                : undefined,
            csvResults:
              source === 'csv'
                ? predictions.map((row: any) => ({
                    customer_id: Number(row.customer_id),
                    surname: String(row.surname ?? ''),
                    geography: String(row.geography ?? ''),
                    prediction_result: String(row.prediction_result ?? ''),
                    probability: Number(row.probability ?? 0),
                  }))
                : undefined,
            timestamp: item.created_at ?? new Date().toISOString(),
          }
        })
        if (mapped.length > 0) {
          setSavedPredictions(mapped)
          localStorage.setItem('bank-churn-saved-predictions', JSON.stringify(mapped))
        }
      }
    } catch (error) {
      console.warn('Không thể tải lịch sử từ DB', error)
    }
  }

  useEffect(() => {
    const storedPredictions = localStorage.getItem('bank-churn-saved-predictions')
    const storedSessionId = localStorage.getItem('bank-churn-saved-session-id')

    if (storedPredictions) {
      try {
        const parsed = JSON.parse(storedPredictions) as SavedPrediction[]
        if (Array.isArray(parsed)) {
          setSavedPredictions(parsed)
        }
      } catch {
        console.warn('Không thể đọc dữ liệu lưu trữ')
      }
    }

    if (storedSessionId) {
      setSavedSessionId(storedSessionId)
    }

    void fetchPredictionHistory()
  }, [])

  useEffect(() => {
    localStorage.setItem('bank-churn-saved-predictions', JSON.stringify(savedPredictions))
  }, [savedPredictions])

  useEffect(() => {
    if (savedSessionId) {
      localStorage.setItem('bank-churn-saved-session-id', savedSessionId)
    } else {
      localStorage.removeItem('bank-churn-saved-session-id')
    }
  }, [savedSessionId])

  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvResults, setCsvResults] = useState<PredictionResult[]>([])
  const [csvLoading, setCsvLoading] = useState(false)
  const [csvResultTab, setCsvResultTab] = useState<ResultTab>('detail')
  const [modelPerformance, setModelPerformance] = useState([
    { name: 'Logistic Regression', accuracy: 0.87, precision: 0.84, recall: 0.81, f1: 0.82, rocAuc: 0.88 },
    { name: 'Random Forest', accuracy: 0.90, precision: 0.88, recall: 0.86, f1: 0.87, rocAuc: 0.90 },
    { name: 'XGBoost', accuracy: 0.92, precision: 0.90, recall: 0.89, f1: 0.90, rocAuc: 0.91 },
    { name: 'SVM', accuracy: 0.88, precision: 0.85, recall: 0.83, f1: 0.84, rocAuc: 0.89 },
  ])
  const [tuningSummary, setTuningSummary] = useState([
    { name: 'Cross Validation', value: '5-fold', detail: 'Đánh giá ổn định trên nhiều fold' },
    { name: 'Tuning', value: 'Grid Search', detail: 'Tìm tham số tối ưu cho từng mô hình' },
    { name: 'Metric', value: 'Recall + F1', detail: 'Ưu tiên phát hiện khách hàng rời bỏ' },
  ])
  const [experimentSummary, setExperimentSummary] = useState({
    bestModel: 'XGBoost',
    recommendation: 'XGBoost là mô hình tốt nhất vì đạt accuracy cao, recall cao và ROC-AUC tốt nhất.',
    confusionMatrix: { tp: 82, fp: 8, fn: 6, tn: 104 },
  })

  const resetPredictForm = () => {
    setPredictInput({ ...initialCustomer })
  }

  const handlePredictSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMsg('')
    setSaveName('')

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(predictInput),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(json))

      setCurrentPrediction({
        customer_id: json.customer_id,
        surname: predictInput.surname,
        geography: predictInput.geography,
        prediction_result: json.prediction_result,
        probability: json.probability,
        database_status: json.database_status,
      })
      setPredictionSource('single')
      setTotalPredictions((prev) => prev + 1)
      setSinglePanelMode('detail')
      setSingleResultTab('detail')
    } catch (err) {
      const fallback = buildPredictionResult(predictInput)
      setCurrentPrediction(fallback)
      setPredictionSource('single')
      setSavedSessionId(null)
      setTotalPredictions((prev) => prev + 1)
      setSinglePanelMode('detail')
      setSingleResultTab('detail')
      setErrorMsg(`Lỗi backend, đang dùng kết quả demo: ${err}`)
    }
  }

  const handleSave = async () => {
    if (savedSessionId) {
      setErrorMsg('Kết quả này đã được lưu trước đó, không thể lưu lại')
      return
    }

    if (!saveName.trim()) {
      setErrorMsg('Vui lòng nhập tên dự đoán')
      return
    }

    const sessionId = savedSessionId ?? (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString())
    const saveRequest = {
      session_id: sessionId,
      name: saveName.trim(),
      source: predictionSource,
      result: predictionSource === 'single' ? currentPrediction : undefined,
      csvResults: predictionSource === 'csv' ? csvResults : undefined,
      input_data: predictionSource === 'single' ? predictInput : undefined,
    }

    if (predictionSource === 'csv' && csvResults.length > 0) {
      const newSaved: SavedPrediction = {
        id: sessionId,
        session_id: sessionId,
        name: saveName.trim(),
        source: 'csv',
        csvResults: csvResults,
        timestamp: new Date().toISOString(),
      }
      try {
        const res = await fetch('/api/save-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveRequest),
        })
        const json = await res.json()
        if (!res.ok || json.status === 'error') {
          setErrorMsg(json.message || 'Lỗi khi lưu vào DB')
          return
        }
        setSavedPredictions((prev) => [newSaved, ...prev])
        setSavedSessionId(sessionId)
        setSaveName('')
        setErrorMsg('')
      } catch (err) {
        setErrorMsg(`Không thể lưu vào DB: ${err}`)
      }
      return
    }

    if (!currentPrediction) {
      setErrorMsg('Không có kết quả để lưu')
      return
    }

    const newSaved: SavedPrediction = {
      id: sessionId,
      session_id: sessionId,
      name: saveName.trim(),
      source: 'single',
      result: currentPrediction,
      timestamp: new Date().toISOString(),
    }

    try {
      const res = await fetch('/api/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveRequest),
      })
      const json = await res.json()
      if (!res.ok || json.status === 'error') {
        setErrorMsg(json.message || 'Lỗi khi lưu vào DB')
        return
      }
      setSavedPredictions((prev) => [newSaved, ...prev])
      setSavedSessionId(sessionId)
      setSaveName('')
      setErrorMsg('')
    } catch (err) {
      setErrorMsg(`Không thể lưu vào DB: ${err}`)
    }
  }

  const handleCsvFileChange = (file: File | null) => {
    setCsvFile(file)
    setCsvResults([])
    setErrorMsg('')
    setSavedSessionId(null)
  }

  const handleCsvUpload = async () => {
    if (!csvFile) {
      setErrorMsg('Vui lòng chọn file CSV')
      return
    }

    setCsvLoading(true)
    setErrorMsg('')
    setCsvResults([])

    let parsedRows: Array<Record<string, string | number>> = []

    try {
      const text = await csvFile.text()
      const lines = text.trim().split('\n')

      if (lines.length < 2) {
        setErrorMsg('File CSV phải có ít nhất 1 dòng dữ liệu')
        setCsvLoading(false)
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim())
      parsedRows = []

      for (let i = 1; i < lines.length; i += 1) {
        const values = lines[i].split(',').map((v) => v.trim())
        const row: Record<string, string | number> = {}
        headers.forEach((header, idx) => {
          const value = values[idx] ?? ''
          row[header] = isNaN(Number(value)) ? value : Number(value)
        })
        parsedRows.push(row)
      }

      const res = await fetch('/api/predict-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: parsedRows }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(json))

      setCsvResults(json.predictions || [])
      setPredictionSource('csv')
      setTotalPredictions((prev) => prev + 1)
      setCsvResultTab('detail')
    } catch (err) {
      const fallbackRows = parsedRows.map((row) => buildPredictionResult({
        customer_id: Number(row.customer_id ?? 0),
        surname: String(row.surname ?? 'Unknown'),
        credit_score: Number(row.credit_score ?? 0),
        geography: String(row.geography ?? 'Unknown'),
        gender: String(row.gender ?? 'Unknown'),
        age: Number(row.age ?? 0),
        tenure: Number(row.tenure ?? 0),
        balance: Number(row.balance ?? 0),
        num_of_products: Number(row.num_of_products ?? 0),
        has_cr_card: Number(row.has_cr_card ?? 0),
        is_active_member: Number(row.is_active_member ?? 0),
        estimated_salary: Number(row.estimated_salary ?? 0),
        complain: Number(row.complain ?? 0),
        satisfaction_score: Number(row.satisfaction_score ?? 0),
        card_type: String(row.card_type ?? 'Unknown'),
        point_earned: Number(row.point_earned ?? 0),
      }))
      setCsvResults(fallbackRows)
      setPredictionSource('csv')
      setTotalPredictions((prev) => prev + 1)
      setCsvResultTab('detail')
      setErrorMsg(`Lỗi backend CSV, đang dùng kết quả demo: ${err}`)
    } finally {
      setCsvLoading(false)
    }
  }

  const fetchDashboard = async () => {
    try {
      const [statsRes, modelRes, tuningRes, expRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/models/performance'),
        fetch('/api/models/tuning'),
        fetch('/api/experiments/summary'),
      ])

      const statsJson = await statsRes.json()
      const modelJson = await modelRes.json()
      const tuningJson = await tuningRes.json()
      const expJson = await expRes.json()

      if (statsRes.ok) {
        setTotalPredictions(statsJson.data.total_predicted)
      }
      if (modelRes.ok && modelJson.data?.models) {
        setModelPerformance(modelJson.data.models.map((model: any) => ({
          name: model.model_name,
          accuracy: model.accuracy,
          precision: model.precision,
          recall: model.recall,
          f1: model.f1_score,
          rocAuc: model.roc_auc,
        })))
      }
      if (tuningRes.ok && tuningJson.data?.items) {
        setTuningSummary(tuningJson.data.items)
      }
      if (expRes.ok && expJson.data) {
        setExperimentSummary({
          bestModel: expJson.data.best_model,
          recommendation: expJson.data.recommendation,
          confusionMatrix: expJson.data.confusion_matrix,
        })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const csvRiskCount = csvResults.filter((pred) => pred.prediction_result.includes('Nguy cơ')).length
  const csvRiskRate = csvResults.length > 0 ? Math.round((csvRiskCount / csvResults.length) * 100) : 0
  const currentItems = currentPrediction ? [currentPrediction] : []
  const dashboardSummary = {
    totalRuns: totalPredictions,
    highRiskCount: currentItems.filter((item) => item.prediction_result.includes('Nguy cơ')).length,
    safeCount: currentItems.filter((item) => !item.prediction_result.includes('Nguy cơ')).length,
    averageProbability: currentItems.length > 0 ? (currentItems.reduce((sum, item) => sum + item.probability, 0) / currentItems.length) : 0,
  }

  const handleLoadSavedPrediction = (savedPrediction: SavedPrediction) => {
    setSaveName(savedPrediction.name)
    setErrorMsg('')
    setSavedSessionId(savedPrediction.id)
    if (savedPrediction.source === 'csv' && savedPrediction.csvResults) {
      setCsvResults(savedPrediction.csvResults)
      setPredictionSource('csv')
      setCsvResultTab('detail')
      setView('predict-csv')
    }

    if (savedPrediction.source === 'single' && savedPrediction.result) {
      setCurrentPrediction(savedPrediction.result)
      setPredictionSource('single')
      setSinglePanelMode('detail')
      setSingleResultTab('detail')
      setView('predict-single')
    }
  }

  useEffect(() => {
    void fetchDashboard()
  }, [])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="badge">AI Analytics</span>
          <h1>Bank Customer Churn</h1>
          <p>Giao diện hiện đại để theo dõi và dự đoán rủi ro khách hàng</p>
        </div>
        <nav>
          <button
            onClick={() => {
              setView('predict-single')
            }}
            className={view === 'predict-single' ? 'active' : ''}
          >
            Dự đoán đơn lẻ
          </button>
          <button onClick={() => { setView('predict-csv') }} className={view === 'predict-csv' ? 'active' : ''}>
            Dự đoán CSV
          </button>
          <button onClick={() => { setView('history') }} className={view === 'history' ? 'active' : ''}>
            Lịch sử
          </button>
          <button onClick={() => { setView('dashboard'); fetchDashboard(); setSinglePanelMode(null) }} className={view === 'dashboard' ? 'active' : ''}>
            Trang chủ
          </button>
        </nav>
      </header>

      <main>
        {view === 'dashboard' && (
          <DashboardView
            totalRuns={dashboardSummary.totalRuns}
            highRiskCount={dashboardSummary.highRiskCount}
            safeCount={dashboardSummary.safeCount}
            averageProbability={dashboardSummary.averageProbability}
            modelPerformance={modelPerformance}
            experimentSummary={experimentSummary}
          />
        )}

        {view === 'predict-single' && (
          <PredictSingleView
            predictInput={predictInput}
            setPredictInput={setPredictInput}
            handlePredictSubmit={handlePredictSubmit}
            resetPredictForm={() => { resetPredictForm(); setErrorMsg('') }}
            currentPrediction={currentPrediction}
            saveName={saveName}
            setSaveName={setSaveName}
            savePrediction={handleSave}
            errorMsg={errorMsg}
            singlePanelMode={singlePanelMode}
            setSinglePanelMode={setSinglePanelMode}
            singleResultTab={singleResultTab}
            setSingleResultTab={setSingleResultTab}
            dashboardSummary={dashboardSummary}
            fieldLabels={fieldLabels}
            isSavedSession={savedSessionId !== null}
            onNewPrediction={() => {
              setCurrentPrediction(null)
              resetPredictForm()
              setSaveName('')
              setErrorMsg('')
              setPredictionSource(null)
              setSavedSessionId(null)
            }}
          />
        )}

        {view === 'predict-csv' && (
          <PredictCsvView
            csvFile={csvFile}
            setCsvFile={handleCsvFileChange}
            csvResults={csvResults}
            csvLoading={csvLoading}
            csvResultTab={csvResultTab}
            setCsvResultTab={setCsvResultTab}
            errorMsg={errorMsg}
            saveName={saveName}
            setSaveName={setSaveName}
            savePrediction={handleSave}
            handleCsvUpload={handleCsvUpload}
            csvRiskCount={csvRiskCount}
            csvRiskRate={csvRiskRate}
            isSavedSession={savedSessionId !== null}
          />
        )}

        {view === 'history' && (
          <HistoryView
            savedPredictions={savedPredictions}
            onLoadSavedPrediction={handleLoadSavedPrediction}
            onDeleteSavedPrediction={(id) => {
              setSavedPredictions((prev) => prev.filter((item) => item.id !== id))
              if (savedSessionId === id) {
                setSavedSessionId(null)
              }
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App
