import type { SavedPrediction } from '../types'

type HistoryViewProps = {
  savedPredictions: SavedPrediction[]
  onLoadSavedPrediction: (savedPrediction: SavedPrediction) => void
  onDeleteSavedPrediction: (id: string) => void
}

const HistoryView = ({
  savedPredictions,
  onLoadSavedPrediction,
  onDeleteSavedPrediction,
}: HistoryViewProps) => (
  <section className="panel">
    <div className="section-head">
      <div>
        <h2>Lịch sử dự đoán</h2>
        <p>Xem các dự đoán đã lưu</p>
      </div>
    </div>

    {savedPredictions.length > 0 ? (
      <div className="saved-list">
        {savedPredictions.map((pred) => (
          <div
            key={pred.id}
            onClick={() => onLoadSavedPrediction(pred)}
            className="saved-item"
          >
            <div>
              <h4>{pred.name}</h4>
              <p>{new Date(pred.timestamp).toLocaleString('vi-VN')}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="delete-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  onDeleteSavedPrediction(pred.id)
                }}
              >
                Xóa
              </button>
              <span className="arrow">→</span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p>Chưa có dự đoán nào được lưu</p>
    )}
  </section>
)

export default HistoryView
