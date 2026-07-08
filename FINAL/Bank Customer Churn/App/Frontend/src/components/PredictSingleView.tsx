import { type FormEvent, type Dispatch, type SetStateAction } from 'react'
import type { CustomerData, PredictionResult, ResultTab } from '../types'

type PredictSingleViewProps = {
  predictInput: CustomerData
  setPredictInput: Dispatch<SetStateAction<CustomerData>>
  handlePredictSubmit: (event: FormEvent<HTMLFormElement>) => void
  resetPredictForm: () => void
  currentPrediction: PredictionResult | null
  saveName: string
  setSaveName: Dispatch<SetStateAction<string>>
  savePrediction: () => void
  errorMsg: string
  singlePanelMode: ResultTab | null
  setSinglePanelMode: Dispatch<SetStateAction<ResultTab | null>>
  singleResultTab: ResultTab
  setSingleResultTab: Dispatch<SetStateAction<ResultTab>>
  dashboardSummary: {
    totalRuns: number
    highRiskCount: number
    safeCount: number
    averageProbability: number
  }
  fieldLabels: Record<keyof CustomerData, string>
  isSavedSession: boolean
  onNewPrediction: () => void
}

const PredictSingleView = ({
  predictInput,
  setPredictInput,
  handlePredictSubmit,
  resetPredictForm,
  currentPrediction,
  saveName,
  setSaveName,
  savePrediction,
  errorMsg,
  singlePanelMode,
  setSinglePanelMode,
  singleResultTab,
  setSingleResultTab,
  dashboardSummary,
  fieldLabels,
  isSavedSession,
  onNewPrediction,
}: PredictSingleViewProps) => (
  <section className="panel">
    <div className="section-head">
      <div>
        <h2>Dự đoán Churn Khách hàng</h2>
        <p>Nhập dữ liệu khách hàng để dự đoán rủi ro churn</p>
      </div>
    </div>

    {!currentPrediction ? (
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
    ) : (
      <>
        <div className="hero-card" style={{ background: '#d1fae5', borderColor: '#10b981' }}>
          <div>
            <span className="badge" style={{ background: '#a7f3d0', color: '#047857' }}>✅ Hoàn tất</span>
            <h3>Đã dự đoán xong!</h3>
            <p>Chọn hành động tiếp theo bên dưới</p>
          </div>
        </div>

        {!isSavedSession ? (
          <div className="save-box">
            <h3>💾 Lưu dự đoán này</h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ flex: 1, minWidth: '200px' }}>
                <span style={{ display: 'block', marginBottom: '8px' }}>Tên dự đoán</span>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="VD: Khách hàng A - tháng 1"
                />
              </label>
              <button onClick={savePrediction} className="action-btn">
                Lưu
              </button>
            </div>
            {errorMsg && <p style={{ color: '#dc2626', marginTop: '8px' }}>{errorMsg}</p>}
          </div>
        ) : (
          <div className="save-box">
            <h3>✅ Kết quả đã lưu</h3>
            <p style={{ color: '#64748b', marginTop: '8px' }}>Phiên này hiện là kết quả lưu sẵn từ lịch sử.</p>
          </div>
        )}

        <button onClick={onNewPrediction} className="secondary" style={{ marginTop: '16px' }}>
          Dự đoán mới
        </button>
      </>
    )}

    {currentPrediction && singlePanelMode === 'detail' && (
      <div className="result-panel">
        <h3>📈 Kết quả chi tiết</h3>
        <div className="tab-row">
          <button className={singleResultTab === 'detail' ? 'tab-btn active' : 'tab-btn'} onClick={() => setSingleResultTab('detail')}>Chi tiết</button>
          <button className={singleResultTab === 'summary' ? 'tab-btn active' : 'tab-btn'} onClick={() => setSingleResultTab('summary')}>Tóm tắt</button>
        </div>

        {singleResultTab === 'detail' && (
          <>
            <div className="detail-grid">
              <div className="detail-card">
                <span>ID Khách hàng</span>
                <strong>{currentPrediction.customer_id}</strong>
              </div>
              <div className="detail-card">
                <span>Tên</span>
                <strong>{currentPrediction.surname}</strong>
              </div>
              <div className="detail-card">
                <span>Quốc gia</span>
                <strong>{currentPrediction.geography}</strong>
              </div>
              <div className="detail-card">
                <span>Xác suất</span>
                <strong>{(currentPrediction.probability * 100).toFixed(2)}%</strong>
              </div>
              <div className="detail-card">
                <span>Đánh giá</span>
                <strong className={currentPrediction.prediction_result.includes('Nguy cơ') ? 'text-warning' : 'text-success'}>{currentPrediction.prediction_result}</strong>
              </div>
              <div className="detail-card">
                <span>Mức độ rủi ro</span>
                <strong>{currentPrediction.probability > 0.7 ? 'Cao' : currentPrediction.probability > 0.5 ? 'Trung bình' : 'Thấp'}</strong>
              </div>
            </div>

            <div className="card-grid">
              <div className="info-card">
                <h3>🧾 Giải thích kết quả</h3>
                <p>{currentPrediction.prediction_result.includes('Nguy cơ') ? 'Khách hàng có dấu hiệu tiềm ẩn rời bỏ, nên ưu tiên chăm sóc và kích hoạt các chương trình giữ chân.' : 'Khách hàng đang ở trạng thái ổn định và có khả năng duy trì mối quan hệ lâu dài.'}</p>
              </div>
              <div className="info-card">
                <h3>📌 Thông tin đầu vào</h3>
                <ul>
                  <li><span>Tuổi</span><strong>{predictInput.age}</strong></li>
                  <li><span>Thời gian thuê</span><strong>{predictInput.tenure}</strong></li>
                  <li><span>Số khiếu nại</span><strong>{predictInput.complain}</strong></li>
                  <li><span>Mức hài lòng</span><strong>{predictInput.satisfaction_score}</strong></li>
                </ul>
              </div>
            </div>
          </>
        )}

        {singleResultTab === 'summary' && (
          <div className="info-card">
            <h3>📊 Tóm tắt tổng quan</h3>
            <ul>
              <li><span>Số lần dự đoán</span><strong>{dashboardSummary.totalRuns}</strong></li>
              <li><span>Nguy cơ cao</span><strong>{dashboardSummary.highRiskCount}</strong></li>
              <li><span>An toàn</span><strong>{dashboardSummary.safeCount}</strong></li>
              <li><span>Xác suất trung bình</span><strong>{(dashboardSummary.averageProbability * 100).toFixed(1)}%</strong></li>
            </ul>
          </div>
        )}

      </div>
    )}
  </section>
)

export default PredictSingleView
