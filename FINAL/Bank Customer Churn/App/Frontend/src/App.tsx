import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

type PredictionResponse = {
  status: string
  customer_id?: number
  prediction_result?: string
  probability?: number
  database_status?: string
}

type DashboardStats = {
  total_predicted: number
  clusters_distribution: { label: string; count: number }[]
  churn_by_geography: { country: string; churn_count: number }[]
}

type CustomerData = {
  customer_id: number
  surname: string
  credit_score: number
  geography: string
  gender: string
  age: number
  tenure: number
  balance: number
  num_of_products: number
  has_cr_card: number
  is_active_member: number
  estimated_salary: number
  complain: number
  satisfaction_score: number
  card_type: string
  point_earned: number
}

const initialCustomer: CustomerData = {
  customer_id: 1,
  surname: 'Nguyen',
  credit_score: 650,
  geography: 'France',
  gender: 'Male',
  age: 35,
  tenure: 3,
  balance: 50000,
  num_of_products: 1,
  has_cr_card: 1,
  is_active_member: 1,
  estimated_salary: 60000,
  complain: 0,
  satisfaction_score: 3,
  card_type: 'Gold',
  point_earned: 100,
}

const fieldLabels: Record<keyof CustomerData, string> = {
  customer_id: 'Customer ID',
  surname: 'Họ tên',
  credit_score: 'Credit Score',
  geography: 'Quốc gia',
  gender: 'Giới tính',
  age: 'Tuổi',
  tenure: 'Thời gian thuê',
  balance: 'Số dư',
  num_of_products: 'Số sản phẩm',
  has_cr_card: 'Có thẻ tín dụng',
  is_active_member: 'Thành viên hoạt động',
  estimated_salary: 'Lương ước tính',
  complain: 'Số khiếu nại',
  satisfaction_score: 'Mức hài lòng',
  card_type: 'Loại thẻ',
  point_earned: 'Điểm tích lũy',
}

function App() {
  const [view, setView] = useState<'dashboard' | 'predict' | 'bulk'>('dashboard')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [predictInput, setPredictInput] = useState<CustomerData>(initialCustomer)
  const [predictMessage, setPredictMessage] = useState<string>('')
  const [csvRows, setCsvRows] = useState<CustomerData[]>([])
  const [bulkLog, setBulkLog] = useState<string>('')
  const [bulkRunning, setBulkRunning] = useState(false)

  const showResultText = useMemo(() => predictMessage || 'Chưa có kết quả', [predictMessage])

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const res = await fetch('/api/dashboard/stats')
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Lấy thống kê thất bại')
      setStats(json.data)
    } catch (err) {
      setStats(null)
      setPredictMessage(`Lỗi lấy thống kê: ${err}`)
    } finally {
      setLoadingStats(false)
    }
  }

  const handlePredictSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPredictMessage('Đang gửi dự đoán...')
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(predictInput),
      })
      const json: PredictionResponse = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(json))
      setPredictMessage(`Kết quả: ${json.prediction_result || 'Không xác định'}\nXác suất: ${json.probability ?? '-'}\nDB: ${json.database_status ?? '-'}`)
    } catch (err) {
      setPredictMessage(`Lỗi dự đoán: ${err}`)
    }
  }

  const parseCsv = (text: string): CustomerData[] => {
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map((h) => h.trim())
    return lines.slice(1).map((line) => {
      const values = line.split(',')
      const obj: Record<string, unknown> = {}
      headers.forEach((header, index) => {
        const value = values[index]?.trim() ?? ''
        obj[header] = value === '' ? null : Number(value).toString() === value ? Number(value) : value
      })
      return obj as CustomerData
    })
  }

  const handleCsvFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const rows = parseCsv(text)
    setCsvRows(rows)
    setBulkLog(`Đã đọc ${rows.length} dòng`)
  }

  const runBulk = async () => {
    if (!csvRows.length) return
    setBulkRunning(true)
    const logs: string[] = []
    let success = 0
    for (const row of csvRows) {
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        })
        const json = await res.json()
        if (!res.ok) {
          logs.push(`ERR: ${JSON.stringify(json)}`)
        } else {
          success += 1
          logs.push(`OK ${row.customer_id ?? ''} -> ${json.prediction_result}`)
        }
      } catch (err) {
        logs.push(`ERR network: ${err}`)
      }
    }
    setBulkLog(`${logs.join('\n')}\nHoàn thành ${success}/${csvRows.length}`)
    setBulkRunning(false)
  }

  const resetPredictForm = () => setPredictInput({ ...initialCustomer })

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="badge">AI Analytics</span>
          <h1>Bank Customer Churn</h1>
          <p>Giao diện React hiện đại để theo dõi và dự đoán rủi ro khách hàng</p>
        </div>
        <nav>
          <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}>
            Dashboard
          </button>
          <button onClick={() => setView('predict')} className={view === 'predict' ? 'active' : ''}>
            Dự đoán đơn lẻ
          </button>
          <button onClick={() => setView('bulk')} className={view === 'bulk' ? 'active' : ''}>
            Dự đoán CSV
          </button>
        </nav>
      </header>

      <main>
        {view === 'dashboard' && (
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Dashboard</h2>
                <p>Thông tin tổng quan về các dự đoán churn mới nhất</p>
              </div>
              <button onClick={fetchStats} disabled={loadingStats}>
                {loadingStats ? 'Đang làm mới...' : 'Làm mới'}
              </button>
            </div>

            <div className="hero-card">
              <div>
                <span className="badge">Live insights</span>
                <h3>Giám sát rủi ro khách hàng theo thời gian thực</h3>
                <p>Nhận diện xu hướng, phân nhóm khách hàng và mức độ rủi ro ở từng khu vực.</p>
              </div>
              <div className="hero-metrics">
                <div className="metric-pill">
                  <span>Tổng dự đoán</span>
                  <strong>{stats?.total_predicted ?? '-'}</strong>
                </div>
                <div className="metric-pill">
                  <span>Nhóm phân bố</span>
                  <strong>{stats?.clusters_distribution?.length ?? 0}</strong>
                </div>
              </div>
            </div>

            <div className="card-grid">
              <div className="info-card">
                <h3>Phân bố cụm</h3>
                {stats?.clusters_distribution.length ? (
                  <ul>
                    {stats.clusters_distribution.map((group) => (
                      <li key={group.label}>
                        <span>{group.label}</span>
                        <strong>{group.count}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Không có dữ liệu</p>
                )}
              </div>
              <div className="info-card">
                <h3>Rủi ro theo vùng</h3>
                {stats?.churn_by_geography.length ? (
                  <ul>
                    {stats.churn_by_geography.map((item) => (
                      <li key={item.country}>
                        <span>{item.country}</span>
                        <strong>{item.churn_count}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Không có dữ liệu</p>
                )}
              </div>
            </div>
          </section>
        )}

        {view === 'predict' && (
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Dự đoán đơn lẻ</h2>
                <p>Nhập dữ liệu khách hàng để xem kết quả dự đoán chi tiết.</p>
              </div>
            </div>
            <form onSubmit={handlePredictSubmit} className="form-grid">
              {Object.entries(predictInput).map(([key, value]) => (
                <label key={key}>
                  <span>{fieldLabels[key as keyof CustomerData] || key}</span>
                  <input
                    type={typeof value === 'number' ? 'number' : 'text'}
                    value={String(value)}
                    onChange={(event) => {
                      const raw = event.target.value
                      setPredictInput((prev) => ({
                        ...prev,
                        [key]: typeof prev[key as keyof CustomerData] === 'number' ? Number(raw) : raw,
                      }))
                    }}
                  />
                </label>
              ))}
              <div className="actions">
                <button type="submit">Dự đoán</button>
                <button type="button" onClick={resetPredictForm} className="secondary">
                  Reset
                </button>
              </div>
            </form>
            <div className="result-box">
              <h3>Kết quả dự đoán</h3>
              <pre>{showResultText}</pre>
            </div>
          </section>
        )}

        {view === 'bulk' && (
          <section className="panel">
            <div className="section-head">
              <div>
                <h2>Dự đoán CSV</h2>
                <p>Upload file CSV và chạy dự đoán hàng loạt cho nhiều khách hàng.</p>
              </div>
            </div>
            <div className="upload-card">
              <p>File CSV cần có header: customer_id,surname,credit_score,geography,gender,age,tenure,balance,num_of_products,has_cr_card,is_active_member,estimated_salary,complain,satisfaction_score,card_type,point_earned</p>
              <input type="file" accept=".csv" onChange={handleCsvFile} />
              <div className="actions">
                <button type="button" onClick={runBulk} disabled={bulkRunning || !csvRows.length}>
                  {bulkRunning ? 'Đang chạy...' : 'Chạy hàng loạt'}
                </button>
              </div>
            </div>
            <div className="result-box">
              <h3>Log xử lý</h3>
              <pre>{bulkLog || 'Chưa có log'}</pre>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
