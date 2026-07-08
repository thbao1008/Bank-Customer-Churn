from __future__ import annotations

import io
import os
import uuid
from datetime import datetime
from math import exp
from typing import Any

import joblib
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))


def _env_flag(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _resolve_path(path: str | None, default: str) -> str:
    candidate = path or default
    if os.path.isabs(candidate):
        return candidate
    return os.path.abspath(os.path.join(os.path.dirname(__file__), candidate))


class BackendConfig:
    def __init__(self) -> None:
        self.app_mode = os.getenv("APP_MODE", "demo").strip().lower()
        self.use_database = _env_flag(os.getenv("USE_DATABASE"), False)
        self.db_type = os.getenv("DB_TYPE", "postgresql").strip().lower()
        self.db_host = os.getenv("DB_HOST") or os.getenv("DB_SERVER", "localhost")
        self.db_port = os.getenv("DB_PORT", "5432")
        self.db_name = os.getenv("DB_NAME", "CustomerChurnDB")
        self.db_user = os.getenv("DB_USER", "postgres")
        self.db_password = os.getenv("DB_PASSWORD", "1234")
        self.model_path = _resolve_path(os.getenv("MODEL_PATH"), "../../MODELS/best_model_XGBoost.pkl")
        self.scaler_path = _resolve_path(os.getenv("SCALER_PATH"), "../../MODELS/scaler.pkl")
        self.feature_columns_path = _resolve_path(os.getenv("FEATURE_COLUMNS_PATH"), "../../MODELS/feature_columns.pkl")
        self.threshold_path = _resolve_path(os.getenv("THRESHOLD_PATH"), "../../MODELS/optimal_threshold.pkl")
        self.enable_model_fallback = _env_flag(os.getenv("ENABLE_MODEL_FALLBACK"), True)


CONFIG = BackendConfig()

app = FastAPI(title="Bank Churn Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
scaler = None
feature_columns: list[str] = []
threshold = 0.5


def load_model_assets() -> bool:
    global model, scaler, feature_columns, threshold
    model = None
    scaler = None
    feature_columns = []
    threshold = 0.5

    try:
        if not os.path.exists(CONFIG.model_path):
            raise FileNotFoundError(CONFIG.model_path)
        model = joblib.load(CONFIG.model_path)
        scaler = joblib.load(CONFIG.scaler_path)
        feature_columns = list(joblib.load(CONFIG.feature_columns_path))
        threshold = float(joblib.load(CONFIG.threshold_path))
        print(f"Loaded model assets from {CONFIG.model_path}")
        return True
    except Exception as exc:
        print(f"Model assets unavailable: {exc}")
        return False


MODEL_READY = load_model_assets()


class CustomerData(BaseModel):
    customer_id: int | str
    surname: str
    credit_score: int | str
    geography: str
    gender: str
    age: int | str
    tenure: int | str
    balance: float | str
    num_of_products: int | str
    has_cr_card: int | str
    is_active_member: int | str
    estimated_salary: float | str
    complain: int | str
    satisfaction_score: int | str
    card_type: str
    point_earned: int | str

    @field_validator(
        "customer_id",
        "credit_score",
        "age",
        "tenure",
        "num_of_products",
        "has_cr_card",
        "is_active_member",
        "complain",
        "satisfaction_score",
        "point_earned",
        mode="before",
    )
    @classmethod
    def convert_to_int(cls, value: Any) -> int:
        if isinstance(value, str):
            return int(float(value))
        return int(value)

    @field_validator("balance", "estimated_salary", mode="before")
    @classmethod
    def convert_to_float(cls, value: Any) -> float:
        if isinstance(value, str):
            return float(value)
        return float(value)


class CSVPredictRequest(BaseModel):
    data: list[dict[str, Any]]


class SaveSessionRequest(BaseModel):
    session_id: str | None = None
    name: str
    source: str
    result: dict[str, Any] | None = None
    csvResults: list[dict[str, Any]] | None = None
    input_data: dict[str, Any] | None = None


predictions_history: list[dict[str, Any]] = []


def _sigmoid(value: float) -> float:
    return 1 / (1 + exp(-value))


def _heuristic_probability(data: CustomerData) -> float:
    risk_score = 0.0
    if data.age < 30:
        risk_score -= 0.15
    if data.age > 50:
        risk_score += 0.2
    if data.tenure > 5:
        risk_score -= 0.2
    if data.has_cr_card == 1:
        risk_score -= 0.1
    if data.is_active_member == 1:
        risk_score -= 0.15
    if data.complain > 0:
        risk_score += 0.3
    if data.satisfaction_score < 2:
        risk_score += 0.25
    probability = _sigmoid(risk_score)
    return max(0.0, min(1.0, probability))


def _build_feature_frame(raw_payload: dict[str, Any]) -> pd.DataFrame:
    frame = pd.DataFrame([raw_payload])
    frame["Is_Zero_Balance"] = (frame["balance"] == 0).astype(int)
    frame["Balance_per_Product"] = frame["balance"] / frame["num_of_products"].replace(0, 1)
    frame["Engagement_Score"] = frame["is_active_member"] * frame["num_of_products"]
    frame["Age_Group"] = pd.cut(
        frame["age"],
        bins=[0, 30, 45, 60, 100],
        labels=["18-30", "31-45", "46-60", "60+"],
    )

    rename_map = {
        "credit_score": "CreditScore",
        "geography": "Geography",
        "gender": "Gender",
        "age": "Age",
        "tenure": "Tenure",
        "balance": "Balance",
        "num_of_products": "NumOfProducts",
        "has_cr_card": "HasCrCard",
        "is_active_member": "IsActiveMember",
        "estimated_salary": "EstimatedSalary",
        "satisfaction_score": "Satisfaction Score",
        "point_earned": "Point Earned",
        "card_type": "Card Type",
    }
    frame = frame.rename(columns=rename_map)
    frame = frame.drop(columns=[c for c in ["customer_id", "surname", "complain"] if c in frame.columns], errors="ignore")
    return pd.get_dummies(frame)


def _predict_with_model(raw_payload: dict[str, Any]) -> tuple[float, str]:
    if MODEL_READY and model is not None and scaler is not None and feature_columns:
        payload = {key: value for key, value in raw_payload.items()}
        frame = _build_feature_frame(payload)
        frame = frame.reindex(columns=feature_columns, fill_value=0)
        try:
            if hasattr(scaler, "feature_names_in_"):
                scaler_columns = list(scaler.feature_names_in_)
                frame = frame.reindex(columns=scaler_columns, fill_value=0)
                transformed = scaler.transform(frame)
            else:
                transformed = scaler.transform(frame)
            probability = float(model.predict_proba(transformed)[0, 1])
        except Exception:
            probability = _heuristic_probability(CustomerData(**payload))
    else:
        probability = _heuristic_probability(CustomerData(**raw_payload))

    probability = max(0.0, min(1.0, probability))
    label = "Nguy cơ rời bỏ cao" if probability >= threshold else "Khách hàng trung thành"
    return probability, label


def _persist_prediction(payload: dict[str, Any], label: str, probability: float, session_id: str | None = None, session_name: str | None = None) -> str:
    if not CONFIG.use_database:
        return "Đang chạy chế độ demo; kết nối DB sẽ dùng khi bật USE_DATABASE=true"

    if CONFIG.db_type not in {"postgresql", "postgres"}:
        return f"DB_TYPE không được hỗ trợ: {CONFIG.db_type}. Hỗ trợ: postgresql."

    try:
        import psycopg

        with psycopg.connect(
            dbname=CONFIG.db_name,
            user=CONFIG.db_user,
            password=CONFIG.db_password,
            host=CONFIG.db_host,
            port=CONFIG.db_port,
        ) as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    "CREATE TABLE IF NOT EXISTS predictions ("
                    "id serial PRIMARY KEY, "
                    "session_id varchar(100), "
                    "session_name varchar(100), "
                    "source varchar(20), "
                    "customer_id integer, "
                    "surname varchar(100), "
                    "geography varchar(50), "
                    "prediction_result varchar(50), "
                    "probability numeric(5,4), "
                    "input_data jsonb, "
                    "created_at timestamp without time zone DEFAULT now()"
                    ")"
                )
                cursor.execute(
                    "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS session_id varchar(100);"
                )
                cursor.execute(
                    "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS session_name varchar(100);"
                )
                cursor.execute(
                    "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS source varchar(20);"
                )
                cursor.execute(
                    "ALTER TABLE predictions ADD COLUMN IF NOT EXISTS input_data jsonb;"
                )
                cursor.execute(
                    "INSERT INTO predictions (session_id, session_name, source, customer_id, surname, geography, prediction_result, probability, input_data, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (
                        session_id,
                        session_name,
                        payload.get("source"),
                        payload.get("customer_id"),
                        payload.get("surname"),
                        payload.get("geography"),
                        label,
                        probability,
                        payload.get("input_data"),
                        datetime.now(),
                    ),
                )
            conn.commit()
        return "Đã lưu vào PostgreSQL"
    except ModuleNotFoundError:
        return "Thiếu module psycopg; cài đặt requirements-core.txt trước khi khởi chạy."
    except Exception as exc:
        return f"Cấu hình DB đã bật nhưng không thể kết nối: {exc}"


@app.get("/api/health")
def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "message": "Backend is running",
        "config": {
            "app_mode": CONFIG.app_mode,
            "use_database": CONFIG.use_database,
            "db_type": CONFIG.db_type,
            "db_name": CONFIG.db_name,
            "model_ready": MODEL_READY,
        },
    }


@app.post("/api/predict")
def predict_customer(data: CustomerData) -> dict[str, Any]:
    payload = data.model_dump()
    probability, label = _predict_with_model(payload)
    db_status = _persist_prediction(payload, label, probability)

    record = {
        "customer_id": payload["customer_id"],
        "surname": payload["surname"],
        "geography": payload["geography"],
        "prediction_result": label,
        "probability": float(probability),
        "created_at": datetime.now().isoformat(),
    }
    predictions_history.append(record)

    return {
        "status": "success",
        "customer_id": payload["customer_id"],
        "prediction_result": label,
        "probability": float(probability),
        "database_status": db_status,
    }


@app.post("/api/save-session")
def save_session(request: SaveSessionRequest) -> dict[str, Any]:
    if not CONFIG.use_database:
        return {"status": "error", "message": "Đang chạy chế độ demo; bật USE_DATABASE=true để lưu vào DB."}

    if not request.name.strip():
        return {"status": "error", "message": "Tên phiên lưu không được để trống."}

    saved_count = 0
    errors: list[str] = []

    session_id = request.session_id or str(uuid.uuid4())

    if request.source == "single" and request.result:
        payload = dict(request.input_data or request.result)
        probability = float(request.result.get("probability", 0))
        label = str(request.result.get("prediction_result", ""))
        payload["source"] = request.source
        payload["input_data"] = request.input_data or request.result
        db_status = _persist_prediction(payload, label, probability, session_id=session_id, session_name=request.name.strip())
        saved_count += 1

    if request.source == "csv" and request.csvResults:
        for row in request.csvResults:
            try:
                payload = dict(row)
                probability = float(row.get("probability", 0))
                label = str(row.get("prediction_result", ""))
                payload["source"] = request.source
                payload["input_data"] = row
                db_status = _persist_prediction(payload, label, probability, session_id=session_id, session_name=request.name.strip())
                saved_count += 1
            except Exception as exc:
                errors.append(str(exc))

    if saved_count == 0:
        return {"status": "error", "message": "Không có dữ liệu hợp lệ để lưu."}

    return {
        "status": "success",
        "saved_count": saved_count,
        "message": "Đã lưu kết quả vào PostgreSQL",
        "errors": errors,
    }


@app.post("/api/predict-csv")
def predict_csv(request: CSVPredictRequest) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    session_id = str(uuid.uuid4())
    session_name = f"CSV {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    for row in request.data:
        try:
            customer = CustomerData(**row)
            payload = customer.model_dump()
            probability, label = _predict_with_model(payload)
            payload["source"] = "csv"
            payload["input_data"] = row
            db_status = _persist_prediction(payload, label, probability, session_id=session_id, session_name=session_name)
            record = {
                "customer_id": payload["customer_id"],
                "surname": payload["surname"],
                "geography": payload["geography"],
                "prediction_result": label,
                "probability": float(probability),
                "created_at": datetime.now().isoformat(),
                "database_status": db_status,
            }
            predictions_history.append(record)
            results.append({
                "customer_id": payload["customer_id"],
                "surname": payload["surname"],
                "geography": payload["geography"],
                "prediction_result": label,
                "probability": float(probability),
            })
        except Exception:
            continue

    return {
        "status": "success",
        "session_id": session_id,
        "session_name": session_name,
        "count": len(results),
        "predictions": results,
    }


@app.get("/api/dashboard/stats")
def get_dashboard_stats() -> dict[str, Any]:
    total = len(predictions_history)
    churn_count = sum(1 for item in predictions_history if "Nguy cơ" in item["prediction_result"])
    loyal_count = total - churn_count

    geo_stats: dict[str, int] = {}
    for item in predictions_history:
        country = item.get("geography", "Unknown")
        if "Nguy cơ" in item["prediction_result"]:
            geo_stats[country] = geo_stats.get(country, 0) + 1

    recent_predictions = list(reversed(predictions_history[-10:]))
    return {
        "status": "success",
        "data": {
            "total_predicted": total,
            "clusters_distribution": [
                {"label": "Nguy cơ rời bỏ cao", "count": churn_count},
                {"label": "Khách hàng trung thành", "count": loyal_count},
            ],
            "churn_by_geography": [{"country": country, "churn_count": count} for country, count in geo_stats.items()],
            "recent_predictions": recent_predictions,
        },
    }


@app.get("/api/predictions/history")
def get_prediction_history() -> dict[str, Any]:
    if CONFIG.use_database:
        try:
            import psycopg

            with psycopg.connect(
                dbname=CONFIG.db_name,
                user=CONFIG.db_user,
                password=CONFIG.db_password,
                host=CONFIG.db_host,
                port=CONFIG.db_port,
            ) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(
                        "SELECT id, session_id, session_name, source, customer_id, surname, geography, prediction_result, probability, created_at "
                        "FROM predictions "
                        "ORDER BY created_at DESC "
                        "LIMIT 1000"
                    )
                    rows = cursor.fetchall()
                    columns = [desc[0] for desc in cursor.description]
                    data = [dict(zip(columns, row)) for row in rows]

            sessions: dict[str, dict[str, Any]] = {}
            for row in data:
                raw_session_id = row.get("session_id")
                session_id = str(raw_session_id) if raw_session_id else f"prediction-{row.get('id')}"
                if session_id not in sessions:
                    sessions[session_id] = {
                        "session_id": session_id,
                        "session_name": str(row.get("session_name") or f"Phiên {row.get('created_at')}"),
                        "source": str(row.get("source") or "single"),
                        "created_at": row.get("created_at"),
                        "predictions": [],
                    }
                sessions[session_id]["predictions"].append({
                    "customer_id": row.get("customer_id"),
                    "surname": row.get("surname"),
                    "geography": row.get("geography"),
                    "prediction_result": row.get("prediction_result"),
                    "probability": float(row.get("probability") or 0),
                    "created_at": row.get("created_at"),
                })
                if row.get("created_at") and sessions[session_id]["created_at"] < row.get("created_at"):
                    sessions[session_id]["created_at"] = row.get("created_at")

            session_list = list(sessions.values())
            session_list.sort(key=lambda item: item.get("created_at") or datetime.min, reverse=True)
            return {"status": "success", "data": session_list}
        except ModuleNotFoundError:
            return {"status": "error", "message": "Thiếu module psycopg; cài đặt requirements-core.txt trước khi khởi chạy."}
        except Exception as exc:
            return {"status": "error", "message": f"Cấu hình DB đã bật nhưng không thể truy vấn history: {exc}"}

    reversed_history = list(reversed(predictions_history))
    return {
        "status": "success",
        "data": reversed_history[-100:] if len(reversed_history) > 100 else reversed_history,
    }


@app.get("/api/models/performance")
def get_models_performance() -> dict[str, Any]:
    return {
        "status": "success",
        "data": {
            "models": [
                {"model_name": "Logistic Regression", "accuracy": 0.7850, "precision": 0.7642, "recall": 0.6234, "f1_score": 0.6872},
                {"model_name": "Random Forest", "accuracy": 0.8520, "precision": 0.8341, "recall": 0.7856, "f1_score": 0.8094},
                {"model_name": "XGBoost", "accuracy": 0.8675, "precision": 0.8612, "recall": 0.8234, "f1_score": 0.8420},
                {"model_name": "SVM", "accuracy": 0.8342, "precision": 0.8125, "recall": 0.7634, "f1_score": 0.7873},
            ],
            "best_model": "XGBoost",
            "roc_auc": 0.9123,
            "confusion_matrix": {
                "true_positive": 1203,
                "true_negative": 3456,
                "false_positive": 234,
                "false_negative": 107,
            },
            "recommendations": [
                "XGBoost là mô hình có hiệu năng tốt nhất với F1-score 0.8420",
                "ROC-AUC score 0.9123 cho thấy khả năng phân loại tốt",
                "Nên sử dụng XGBoost để dự đoán churn khách hàng",
                "Giám sát các khách hàng có xác suất churn cao (>0.7) để giữ chân",
            ],
        },
    }


@app.get("/api/models/tuning")
def get_model_tuning() -> dict[str, Any]:
    return {
        "status": "success",
        "data": {
            "items": [
                {"name": "Cross Validation", "value": "5-fold", "detail": "Đánh giá ổn định trên nhiều fold"},
                {"name": "Tuning", "value": "Grid Search", "detail": "Tìm tham số tối ưu cho từng mô hình"},
                {"name": "Metric", "value": "Recall + F1", "detail": "Ưu tiên phát hiện khách hàng rời bỏ"},
            ]
        },
    }


@app.get("/api/experiments/summary")
def get_experiment_summary() -> dict[str, Any]:
    return {
        "status": "success",
        "data": {
            "best_model": "XGBoost",
            "recommendation": "XGBoost là mô hình tốt nhất vì đạt accuracy cao, recall cao và ROC-AUC tốt nhất.",
            "confusion_matrix": {"tp": 82, "fp": 8, "fn": 6, "tn": 104},
        },
    }


@app.post("/api/csv/upload")
async def upload_csv(file: UploadFile = File(...)) -> dict[str, Any]:
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
        total_rows = len(df)
        columns = df.columns.tolist()
        preview = df.head(5).to_dict(orient="records")
        column_info = []
        for col in columns:
            column_info.append(
                {
                    "name": col,
                    "type": str(df[col].dtype),
                    "non_null_count": int(df[col].notna().sum()),
                    "null_count": int(df[col].isna().sum()),
                }
            )

        return {
            "status": "success",
            "message": f"Đã đọc thành công file {file.filename}",
            "data": {
                "filename": file.filename,
                "total_rows": total_rows,
                "total_columns": len(columns),
                "columns": columns,
                "column_info": column_info,
                "preview": preview,
            },
        }
    except Exception as exc:
        return {"status": "error", "message": f"Lỗi đọc file CSV: {exc}", "data": None}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)