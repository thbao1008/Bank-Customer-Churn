import { useState, type Dispatch, type SetStateAction } from 'react'
import type { PredictionResult, ResultTab, SavedPrediction } from '../types'

type PredictCsvViewProps = {
  csvFile: File | null
  setCsvFile: (file: File | null) => void
  csvResults: PredictionResult[]
  csvLoading: boolean
  csvResultTab: ResultTab
  setCsvResultTab: Dispatch<SetStateAction<ResultTab>>
  errorMsg: string
  saveName: string
  setSaveName: Dispatch<SetStateAction<string>>
  savePrediction: () => void
  handleCsvUpload: () => void
  csvRiskCount: number
  csvRiskRate: number
  isSavedSession: boolean
}

const PredictCsvView = ({
  csvFile,
  setCsvFile,
  csvResults,
  csvLoading,
  csvResultTab,
  setCsvResultTab,
  errorMsg,
  saveName,
  setSaveName,
  savePrediction,
  handleCsvUpload,
  csvRiskCount,
  csvRiskRate,
  isSavedSession,
}: PredictCsvViewProps) => {
  const [selectedCsvIndex, setSelectedCsvIndex] = useState(0)
  const selectedCsvResult = csvResults[selectedCsvIndex] ?? null
  const csvAverageProbability = csvResults.length > 0 ? (csvResults.reduce((sum, item) => sum + item.probability, 0) / csvResults.length) : 0

  return (
  <section className="panel">
    <div className="section-head">
      <div>
        <h2>Dự đoán CSV</h2>
        <p>Upload file CSV để dự đoán hàng loạt</p>
      </div>
    </div>

    <div style={{ padding: '20px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '20px' }}>
      <label style={{ display: 'block', marginBottom: '12px' }}>
        <span style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Chọn file CSV:</span>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            setCsvFile(e.target.files?.[0] || null)
          }}
        />
      </label>
      {csvFile && <p style={{ fontSize: '0.9rem', color: '#666' }}>📄 {csvFile.name}</p>}
    </div>

    <button
      onClick={handleCsvUpload}
      disabled={csvLoading || !csvFile}
      style={{ opacity: csvLoading || !csvFile ? 0.6 : 1, cursor: csvLoading || !csvFile ? 'not-allowed' : 'pointer' }}
    >
      {csvLoading ? '⏳ Đang xử lý...' : '🚀 Dự đoán'}
    </button>

    {errorMsg && <p style={{ color: '#dc2626', marginTop: '16px' }}>{errorMsg}</p>}

    {csvResults.length > 0 && (
      <>
        {!isSavedSession ? (
          <div className="save-box" style={{ marginTop: '20px' }}>
            <h3>💾 Lưu kết quả CSV</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ flex: 1, minWidth: '200px' }}>
                <span style={{ display: 'block', marginBottom: '8px' }}>Tên dự đoán</span>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="VD: CSV tháng 1"
                />
              </label>
              <button onClick={savePrediction} className="action-btn">
                Lưu CSV
              </button>
            </div>
            {errorMsg && <p style={{ color: '#dc2626', marginTop: '8px' }}>{errorMsg}</p>}
          </div>
        ) : (
          <div className="save-box" style={{ marginTop: '20px' }}>
            <h3>✅ Kết quả đã lưu</h3>
            <p style={{ color: '#64748b', marginTop: '8px' }}>Phiên này hiện là kết quả lưu sẵn từ lịch sử.</p>
          </div>
        )}

        <div className="result-panel" style={{ marginTop: '20px', maxHeight: '680px', overflow: 'hidden' }}>
          <h3>📊 Kết quả dự đoán CSV ({csvResults.length} khách hàng)</h3>
          <div className="tab-row">
            <button className={csvResultTab === 'detail' ? 'tab-btn active' : 'tab-btn'} onClick={() => setCsvResultTab('detail')}>Chi tiết</button>
            <button className={csvResultTab === 'summary' ? 'tab-btn active' : 'tab-btn'} onClick={() => setCsvResultTab('summary')}>Tóm tắt</button>
          </div>

          {csvResultTab === 'detail' && (
            <>
              <div className="hero-card" style={{ marginBottom: '20px' }}>
                <div>
                  <span className="badge">Chi tiết</span>
                  <h4>Khách hàng đang xem</h4>
                  <p>Chi tiết từng dòng dự đoán trong file CSV.</p>
                </div>
                <div className="hero-metrics">
                  <div className="metric-pill"><span>Số dòng</span><strong>{csvResults.length}</strong></div>
                  <div className="metric-pill"><span>Trung bình xác suất</span><strong>{(csvAverageProbability * 100).toFixed(1)}%</strong></div>
                </div>
              </div>

              {selectedCsvResult ? (
                <div className="detail-grid">
                  <div className="detail-card">
                    <span>ID</span>
                    <strong>{selectedCsvResult.customer_id}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Tên</span>
                    <strong>{selectedCsvResult.surname}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Quốc gia</span>
                    <strong>{selectedCsvResult.geography}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Kết quả</span>
                    <strong className={selectedCsvResult.prediction_result.includes('Nguy cơ') ? 'text-warning' : 'text-success'}>{selectedCsvResult.prediction_result}</strong>
                  </div>
                  <div className="detail-card">
                    <span>Xác suất</span>
                    <strong>{(selectedCsvResult.probability * 100).toFixed(2)}%</strong>
                  </div>
                </div>
              ) : (
                <p>Chọn một khách hàng trong danh sách bên dưới để xem chi tiết.</p>
              )}

              <div className="table-container" style={{ marginTop: '20px', maxHeight: '320px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Chọn</th>
                      <th>ID</th>
                      <th>Tên</th>
                      <th>Kết quả</th>
                      <th>Xác suất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvResults.map((pred, idx) => (
                      <tr
                        key={`${pred.customer_id}-${idx}`}
                        className={idx === selectedCsvIndex ? 'highlight' : ''}
                        onClick={() => setSelectedCsvIndex(idx)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{idx === selectedCsvIndex ? '●' : '○'}</td>
                        <td>{pred.customer_id}</td>
                        <td>{pred.surname}</td>
                        <td className={pred.prediction_result.includes('Nguy cơ') ? 'text-warning' : 'text-success'}>{pred.prediction_result}</td>
                        <td>{(pred.probability * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {csvResultTab === 'summary' && (
            <div className="hero-card">
              <div>
                <span className="badge">CSV</span>
                <h4>{csvResults.length} khách hàng trong file</h4>
                <p>Nguy cơ cao: {csvRiskCount}; An toàn: {csvResults.length - csvRiskCount}</p>
              </div>
              <div className="hero-metrics">
                <div className="metric-pill"><span>Tỷ lệ nguy cơ</span><strong>{csvRiskRate}%</strong></div>
                <div className="metric-pill"><span>Xác suất trung bình</span><strong>{(csvAverageProbability * 100).toFixed(1)}%</strong></div>
              </div>
            </div>
          )}

        </div>
      </>
    )}
  </section>
  )
}

export default PredictCsvView
