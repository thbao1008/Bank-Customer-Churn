import type { ExperimentSummary, ModelPerformance } from '../types'

type DashboardViewProps = {
  totalRuns: number
  highRiskCount: number
  safeCount: number
  averageProbability: number
  modelPerformance: ModelPerformance[]
  experimentSummary: ExperimentSummary
}

const DashboardView = ({
  totalRuns,
  highRiskCount,
  safeCount,
  averageProbability,
  modelPerformance,
  experimentSummary,
}: DashboardViewProps) => {
  const rocAucValues = modelPerformance
    .map((model) => Number(model.rocAuc))
    .filter((value) => !Number.isNaN(value))
  const bestRocAuc = rocAucValues.length > 0 ? rocAucValues.reduce((max, value) => Math.max(max, value), rocAucValues[0]).toFixed(2) : 'N/A'

  return (
  <section className="panel">
    <div className="section-head">
      <div>
        <h2>Trang chủ</h2>
        <p>Tổng quan hệ thống và kết quả mô hình</p>
      </div>
    </div>

    <div className="hero-card">
      <div>
        <span className="badge">Live</span>
        <h3>Thông tin chung về dự đoán</h3>
        <p>Dashboard hiển thị tổng quan cho toàn bộ lần chạy và dữ liệu đã phân tích.</p>
      </div>
      <div className="hero-metrics">
        <div className="metric-pill">
          <span>Số lần thực hiện</span>
          <strong>{totalRuns}</strong>
        </div>
        <div className="metric-pill">
          <span>Nguy cơ cao</span>
          <strong>{highRiskCount}</strong>
        </div>
        <div className="metric-pill">
          <span>An toàn</span>
          <strong>{safeCount}</strong>
        </div>
        <div className="metric-pill">
          <span>Xác suất trung bình</span>
          <strong>{(averageProbability * 100).toFixed(1)}%</strong>
        </div>
      </div>
    </div>

    <div className="card-grid">
      <div className="info-card">
        <h3>Huấn luyện mô hình</h3>
        <ul>
          {modelPerformance.map((model) => (
            <li key={model.name}><strong>{model.name}</strong> - accuracy {model.accuracy.toFixed(2)}, recall {model.recall.toFixed(2)}, F1 {model.f1.toFixed(2)}</li>
          ))}
        </ul>
      </div>
      <div className="info-card">
        <h3>Tối ưu tham số</h3>
        <ul>
          <li><strong>Cross Validation</strong> - {experimentSummary.bestModel} sử dụng cấu hình 5-fold để đánh giá mô hình.</li>
          <li><strong>Tuning</strong> - phương pháp tối ưu tham số để cải thiện recall và F1-score.</li>
          <li><strong>Metric</strong> - độ ưu tiên focus vào Recall và F1-score để giảm churn risk.</li>
        </ul>
      </div>
    </div>

    <div className="card-grid">
      <div className="info-card">
        <h3>Kết quả của từng mô hình</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mô hình</th>
                <th>Accuracy</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1</th>
              </tr>
            </thead>
            <tbody>
              {modelPerformance.map((model) => (
                <tr key={model.name} className={model.name === 'XGBoost' ? 'highlight' : ''}>
                  <td><strong>{model.name}</strong></td>
                  <td>{model.accuracy.toFixed(2)}</td>
                  <td>{model.precision.toFixed(2)}</td>
                  <td>{model.recall.toFixed(2)}</td>
                  <td>{model.f1.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="info-card">
        <h3>Đường cong ROC</h3>
        <p><strong>ROC Curve</strong> và <strong>ROC-AUC</strong> giúp đánh giá khả năng phân biệt giữa khách hàng churn và giữ lại.</p>
        <svg className="roc-svg" viewBox="0 0 300 180" role="img" aria-label="ROC curve illustration">
          <line x1="20" y1="150" x2="280" y2="150" stroke="#94a3b8" strokeWidth="2" />
          <line x1="20" y1="20" x2="20" y2="150" stroke="#94a3b8" strokeWidth="2" />
          <path d="M20 150 C80 120, 120 90, 180 70 S260 40, 280 25" fill="none" stroke="#2563eb" strokeWidth="3" />
          <path d="M20 150 C70 100, 130 80, 180 60 S250 35, 280 20" fill="none" stroke="#10b981" strokeWidth="3" />
        </svg>
        <p className="helper-text">ROC-AUC ước tính: {bestRocAuc}.</p>
      </div>
    </div>

    <div className="card-grid">
      <div className="info-card">
        <h3>Confusion Matrix</h3>
        <div className="matrix">
          <div className="matrix-cell positive"><span>TP</span><strong>{experimentSummary.confusionMatrix.tp}</strong></div>
          <div className="matrix-cell negative"><span>FP</span><strong>{experimentSummary.confusionMatrix.fp}</strong></div>
          <div className="matrix-cell negative"><span>FN</span><strong>{experimentSummary.confusionMatrix.fn}</strong></div>
          <div className="matrix-cell positive"><span>TN</span><strong>{experimentSummary.confusionMatrix.tn}</strong></div>
        </div>
        <ul>
          <li><strong>True Positive</strong> - dự đoán đúng khách hàng có nguy cơ churn.</li>
          <li><strong>True Negative</strong> - dự đoán đúng khách hàng an toàn.</li>
          <li><strong>False Positive</strong> - dự đoán sai là churn khi thực tế an toàn.</li>
          <li><strong>False Negative</strong> - dự đoán sai là an toàn khi thực tế churn.</li>
        </ul>
      </div>
      <div className="info-card">
        <h3>Lựa chọn mô hình tốt nhất</h3>
        <p><strong>Phân tích:</strong></p>
        <ul>
          <li>Accuracy: đo độ chính xác tổng thể.</li>
          <li>Recall: đánh giá khả năng phát hiện khách hàng churn.</li>
          <li>F1-score: cân bằng giữa precision và recall.</li>
          <li>ROC-AUC: khả năng phân biệt giữa hai lớp.</li>
        </ul>
        <p><strong>Kết luận:</strong> XGBoost là mô hình có hiệu năng tốt nhất với accuracy, recall và F1 cao nhất trong báo cáo này.</p>
      </div>
    </div>

  </section>
  )
}

export default DashboardView
