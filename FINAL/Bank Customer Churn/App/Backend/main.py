from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import pyodbc
import os
from dotenv import load_dotenv

# Nạp cấu hình từ file .env
load_dotenv()

app = FastAPI(title="Bank Churn Prediction API")

# --- CẤU HÌNH CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- HÀM KẾT NỐI DATABASE ĐỘNG ---
def get_db_connection():
    server = os.getenv("DB_SERVER")
    database = os.getenv("DB_NAME")
    username = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    
    conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={database};UID={username};PWD={password}'
    return pyodbc.connect(conn_str)

# --- NẠP MÔ HÌNH AI ---
print("Đang nạp bộ não AI...")
try:
    model = joblib.load('../../MODELS/best_model_XGBoost.pkl')
    scaler = joblib.load('../../MODELS/scaler.pkl')
    feature_columns = joblib.load('../../MODELS/feature_columns.pkl')
    threshold = joblib.load('../../MODELS/optimal_threshold.pkl')
    print("Nạp thành công!")
except Exception as e:
    print(f"Lỗi nạp mô hình (Kiểm tra lại đường dẫn): {e}")

# --- ĐỊNH NGHĨA KHUNG DỮ LIỆU ---
class CustomerData(BaseModel):
    customer_id: int
    surname: str
    credit_score: int
    geography: str
    gender: str
    age: int
    tenure: int
    balance: float
    num_of_products: int
    has_cr_card: int
    is_active_member: int
    estimated_salary: float
    complain: int
    satisfaction_score: int
    card_type: str
    point_earned: int

# --- API DỰ ĐOÁN VÀ LƯU DATABASE ---
@app.post("/api/predict")
def predict_customer(data: CustomerData):
    input_dict = data.dict()
    df = pd.DataFrame([input_dict])
    
    df['Is_Zero_Balance'] = (df['balance'] == 0).astype(int)
    df['Balance_per_Product'] = df['balance'] / df['num_of_products'].replace(0, 1)
    df['Engagement_Score'] = df['is_active_member'] * df['num_of_products']
    df['Age_Group'] = pd.cut(df['age'], bins=[0, 30, 45, 60, 100], labels=['18-30', '31-45', '46-60', '60+'])
    
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
        "card_type": "Card Type"
    }
    df = df.rename(columns=rename_map)
    
    cols_to_drop = ['customer_id', 'surname', 'complain']
    df = df.drop(columns=[c for c in cols_to_drop if c in df.columns], errors='ignore')
    

    df_encoded = pd.get_dummies(df)
    
    for col in feature_columns:
        if col not in df_encoded.columns:
            df_encoded[col] = 0
    df_encoded = df_encoded[feature_columns]

    if hasattr(scaler, 'feature_names_in_'):
        scaler_cols = scaler.feature_names_in_
        df_encoded[scaler_cols] = scaler.transform(df_encoded[scaler_cols])
    else:
        df_encoded = scaler.transform(df_encoded)
        

    print("\n--- KIỂM TRA LỖI TÊN CỘT ---")
    print("AI ĐANG CẦN CỘT NÀY:", feature_columns[:10]) 
    print("API ĐANG CÓ CỘT NÀY:", df_encoded.columns.tolist()[:10])
    

    probs = model.predict_proba(df_encoded)[:, 1]
    
    real_prediction = 1 if probs[0] >= threshold else 0
    
    cluster_label = "Nguy cơ rời bỏ cao" if real_prediction == 1 else "Khách hàng trung thành"


    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        insert_query = """
        INSERT INTO customers (customer_id, surname, credit_score, geography, gender, age, tenure, balance, num_of_products, has_cr_card, is_active_member, estimated_salary, complain, satisfaction_score, card_type, point_earned, cluster_label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        cursor.execute(insert_query, (
            data.customer_id, data.surname, data.credit_score, data.geography, data.gender, data.age, data.tenure, data.balance, data.num_of_products, data.has_cr_card, data.is_active_member, data.estimated_salary, data.complain, data.satisfaction_score, data.card_type, data.point_earned, cluster_label
        ))
        conn.commit()
        conn.close()
        db_status = "Lưu SQL Server thành công!"
    except Exception as e:
        db_status = f"Lỗi lưu Database: {str(e)}"

    return {
        "status": "success",
        "customer_id": data.customer_id,
        "prediction_result": cluster_label,
        "probability": float(probs[0]),
        "database_status": db_status
    }

# --- API THỐNG KÊ CHO TRANG DASHBOARD ---
@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM customers WHERE cluster_label IS NOT NULL")
        total_row = cursor.fetchone()
        total_predicted = total_row[0] if total_row else 0
        
        cursor.execute("SELECT cluster_label, COUNT(*) FROM customers WHERE cluster_label IS NOT NULL GROUP BY cluster_label")
        cluster_stats = [{"label": row[0], "count": row[1]} for row in cursor.fetchall()]
            
        cursor.execute("SELECT geography, COUNT(*) FROM customers WHERE cluster_label = N'Nguy cơ rời bỏ cao' GROUP BY geography")
        geo_stats = [{"country": row[0], "churn_count": row[1]} for row in cursor.fetchall()]
            
        conn.close()
        
        return {
            "status": "success",
            "data": {
                "total_predicted": total_predicted,
                "clusters_distribution": cluster_stats,
                "churn_by_geography": geo_stats
            }
        }
    except Exception as e:
        return {"status": "error", "message": f"Lỗi truy vấn Database: {str(e)}"}