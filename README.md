# Bank Customer Churn Prediction System

Hệ thống dự đoán và phân tích khách hàng rời bỏ dịch vụ (churn) bằng mô hình Machine Learning XGBoost.

## 📋 Mục lục

- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Hướng Dẫn Cài Đặt](#hướng-dẫn-cài-đặt)
- [Chạy Ứng Dụng](#chạy-ứng-dụng)
- [Cách Hoạt Động](#cách-hoạt-động)
- [API Endpoints](#api-endpoints)
- [Tính Năng](#tính-năng)

---

## 🏗️ Kiến Trúc Hệ Thống

```
Bank Customer Churn
├── App/
│   ├── Backend/           # FastAPI server (Python)
│   │   ├── main.py        # API endpoints & business logic
│   │   ├── .env           # Configuration
│   │   └── MODELS/        # Pre-trained XGBoost model
│   │
│   └── Frontend/          # React + Vite + TypeScript
│       ├── src/App.tsx    # Main application
│       └── package.json   # Dependencies
│
├── DATA/                  # Database schemas & sample data
│   ├── CustomerChurnDB.sql
│   └── customers.csv
│
├── NOTEBOOKS/             # Jupyter notebooks (analysis)
└── MODELS/               # Pre-trained ML models
    ├── best_model_XGBoost.pkl
    ├── scaler.pkl
    ├── feature_columns.pkl
    └── optimal_threshold.pkl
```

### Công Nghệ

- **Backend**: FastAPI, PostgreSQL, XGBoost, scikit-learn
- **Frontend**: React 18, TypeScript, Vite, Fetch API
- **Database**: PostgreSQL
- **ML Model**: XGBoost Classifier

---

## ⚙️ Yêu Cầu Hệ Thống

- Python 3.10+
- Node.js 16+
- PostgreSQL 12+ (tùy chọn, có thể chạy demo mode)
- Windows / macOS / Linux

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Setup Backend

#### Bước 1: Cấu Hình Environment

```bash
cd "FINAL/Bank Customer Churn/App/Backend"

# Copy file cấu hình
cp env.example .env
```

Chỉnh sửa `.env`:

```env
# Chế độ chạy
APP_MODE=production
USE_DATABASE=true

# PostgreSQL
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=CustomerChurnDB
DB_USER=postgres
DB_PASSWORD=1234
DB_SERVER=localhost

# Model
MODEL_PATH=../../MODELS/best_model_XGBoost.pkl
SCALER_PATH=../../MODELS/scaler.pkl
FEATURE_COLUMNS_PATH=../../MODELS/feature_columns.pkl
THRESHOLD_PATH=../../MODELS/optimal_threshold.pkl
ENABLE_MODEL_FALLBACK=true
```

#### Bước 2: Cài Đặt Dependencies

```bash
# Tạo virtual environment (tùy chọn nhưng khuyến nghị)
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Cài đặt thư viện
pip install -r requirements-core.txt
```

#### Bước 3: Cấu Hình PostgreSQL (nếu sử dụng DB)

```bash
# Khởi động PostgreSQL service
# Windows: Services > PostgreSQL > Start
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Tạo database
psql -U postgres -c "CREATE DATABASE CustomerChurnDB;"

# Import schema
psql -U postgres -d CustomerChurnDB -f ../../DATA/CustomerChurnDB_postgres.sql
```

### 2. Setup Frontend

```bash
cd "FINAL/Bank Customer Churn/App/Frontend"

# Cài đặt dependencies
npm install

# Hoặc với yarn
yarn install
```

---

## ▶️ Chạy Ứng Dụng

### Cách Nhanh Nhất (Dùng Batch Files)

**Windows users** - Chỉ cần double-click 2 file này:

1. **Backend**: Double-click `App/Backend/run-be.bat`
   - Sẽ tự động cài dependencies
   - Chạy server tại `http://localhost:8000`

2. **Frontend**: Double-click `App/Frontend/run-fe.bat`
   - Sẽ tự động cài npm packages
   - Chạy app tại `http://localhost:5173`

---

### Cách Manual (Command Line)

#### Backend

```bash
cd "FINAL/Bank Customer Churn/App/Backend"

# Chế độ phát triển (auto-reload)
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Chế độ sản xuất
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Backend sẽ chạy tại: **http://localhost:8000**

API Docs (Swagger UI): **http://localhost:8000/docs**

#### Frontend

```bash
cd "FINAL/Bank Customer Churn/App/Frontend"

# Chế độ phát triển
npm run dev

# Hoặc với yarn
yarn dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

---

## 🔄 Cách Hoạt Động

### Luồng Dự Đoán Đơn Lẻ

1. **Người dùng** nhập dữ liệu khách hàng trên giao diện frontend
2. **Frontend** gửi POST request tới `/api/predict`
3. **Backend** nhận request, xử lý dữ liệu:
   - Validate input bằng `CustomerData` model
   - Chuẩn hóa dữ liệu bằng scaler
   - Dự đoán bằng XGBoost model
   - Lưu kết quả vào PostgreSQL (nếu `USE_DATABASE=true`)
4. **Backend** trả về dự đoán (xác suất & nhãn)
5. **Frontend** hiển thị kết quả & cho phép lưu phiên

### Luồng Dự Đoán Hàng Loạt (CSV)

1. **Người dùng** upload file CSV
2. **Frontend** đọc file, gửi từng dòng tới `/api/predict-csv`
3. **Backend** xử lý tất cả dòng trong một session:
   - Dự đoán từng khách hàng
   - Nhóm dưới một `session_id` chung
   - Lưu tất cả vào DB
4. **Frontend** hiển thị danh sách kết quả & thống kê
5. **Người dùng** có thể lưu phiên CSV

### Luồng Xem Lịch Sử

1. **Frontend** gọi `/api/predictions/history` khi load trang
2. **Backend** truy vấn PostgreSQL, nhóm dữ liệu theo `session_id`
3. **Backend** trả về danh sách các phiên đã lưu
4. **Frontend** lưu vào `localStorage` để cache
5. **Người dùng** click vào một phiên để xem chi tiết & tải lại

### Lưu Session

1. **Người dùng** nhập tên & bấm "Lưu"
2. **Frontend** gửi `/api/save-session` với:
   - `session_id`: UUID (unique ID cho phiên)
   - `name`: Tên do người dùng nhập
   - `source`: "single" hoặc "csv"
   - `result` hoặc `csvResults`: Dữ liệu dự đoán
   - `input_data`: Dữ liệu đầu vào gốc
3. **Backend** lưu từng dòng vào bảng `predictions` với `session_id` chung
4. **Frontend** thêm vào `savedPredictions` state & `localStorage`

---

## 📡 API Endpoints

### Health Check
```
GET /api/health
Response: { status, config, use_database, model_ready }
```

### Dự Đoán Đơn Lẻ
```
POST /api/predict
Body: { customer_id, surname, credit_score, ..., point_earned }
Response: { status, customer_id, prediction_result, probability, database_status }
```

### Dự Đoán Hàng Loạt
```
POST /api/predict-csv
Body: { data: [{ customer_id, surname, ... }, ...] }
Response: { status, session_id, session_name, count, predictions }
```

### Lưu Session
```
POST /api/save-session
Body: { session_id, name, source, result/csvResults, input_data }
Response: { status, saved_count, message }
```

### Xem Lịch Sử
```
GET /api/predictions/history
Response: { status, data: [{ session_id, session_name, source, created_at, predictions: [...] }, ...] }
```

### Thống Kê Dashboard
```
GET /api/dashboard/stats
Response: { status, data: { total, churn_count, churn_rate, ... } }
```

### Hiệu Suất Mô Hình
```
GET /api/models/performance
Response: { status, data: { models: [...] } }
```

---

## ✨ Tính Năng

### Frontend

- ✅ **Dự đoán đơn lẻ** - Nhập form, dự đoán ngay
- ✅ **Dự đoán CSV** - Upload file Excel/CSV, dự đoán hàng loạt
- ✅ **Lịch sử** - Xem & quản lý các phiên dự đoán đã lưu
- ✅ **Dashboard** - Thống kê, biểu đồ hiệu suất
- ✅ **Lưu localStorage** - Dữ liệu không mất khi reload
- ✅ **Responsive Design** - Tương thích mobile & desktop

### Backend

- ✅ **Mô hình XGBoost** - Độ chính xác cao (86.75%)
- ✅ **PostgreSQL persistence** - Lưu trữ dài hạn
- ✅ **Session grouping** - Nhóm kết quả theo phiên
- ✅ **Automatic fallback** - Chế độ demo nếu model không sẵn
- ✅ **API documentation** - Swagger UI tự động

---

## 🛠️ Troubleshooting

### Backend không kết nối DB

**Lỗi**: `Cấu hình DB đã bật nhưng không thể kết nối`

**Giải pháp**:
1. Kiểm tra PostgreSQL đang chạy: `psql -U postgres -c "SELECT version();"`
2. Kiểm tra `.env` có đúng credentials
3. Tạo database: `psql -U postgres -c "CREATE DATABASE CustomerChurnDB;"`
4. Đặt `USE_DATABASE=false` để chạy demo mode

### Frontend không thấy dự đoán

**Lỗi**: History trống, không hiển thị dự đoán

**Giải pháp**:
1. Kiểm tra backend đang chạy: `curl http://localhost:8000/api/health`
2. Xóa localStorage: F12 → Application → localStorage → Clear All
3. Reload trang
4. Kiểm tra Network tab xem request có thành công

### Model không load

**Lỗi**: `Model assets unavailable`

**Giải pháp**:
1. Kiểm tra file model tồn tại: `MODELS/best_model_XGBoost.pkl`
2. Kiểm tra đường dẫn trong `.env` chính xác
3. Đặt `ENABLE_MODEL_FALLBACK=true` để dùng heuristic fallback

---

## 📝 Dữ Liệu Đầu Vào

### CSV Format

```
customer_id,surname,credit_score,geography,gender,age,tenure,balance,num_of_products,has_cr_card,is_active_member,estimated_salary,complain,satisfaction_score,card_type,point_earned
1,Nguyen,750,France,Male,35,3,50000,1,1,1,60000,0,3,Gold,100
2,Smith,680,Germany,Female,42,7,125000,2,1,0,95000,1,2,Silver,250
```

### Fields

| Field | Type | Ví dụ |
|-------|------|-------|
| customer_id | integer | 1 |
| surname | string | Nguyen |
| credit_score | integer | 650-850 |
| geography | string | France, Germany, Spain |
| gender | string | Male, Female |
| age | integer | 18-100 |
| tenure | integer | 0-10 |
| balance | float | 0-250000 |
| num_of_products | integer | 1-4 |
| has_cr_card | integer | 0-1 |
| is_active_member | integer | 0-1 |
| estimated_salary | float | 10000-200000 |
| complain | integer | 0+ |
| satisfaction_score | integer | 1-5 |
| card_type | string | Gold, Silver, Platinum |
| point_earned | integer | 0+ |

---

## 📊 Hiệu Suất Mô Hình

| Mô Hình | Accuracy | Precision | Recall | F1 |
|---------|----------|-----------|--------|-----|
| Logistic Regression | 78.5% | 76.4% | 62.3% | 68.7% |
| Random Forest | 85.2% | 83.4% | 78.6% | 80.9% |
| **XGBoost** | **86.75%** | **86.1%** | **82.3%** | **84.2%** |
| SVM | 83.4% | 81.3% | 76.3% | 78.7% |

---

## 📄 License

MIT

---

## 👨‍💻 Contributors

Phát triển bởi Bank Churn Prediction Team

---

**Last Updated**: 2026-07-08

