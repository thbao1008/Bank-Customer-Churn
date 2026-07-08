import pandas as pd
import psycopg
import joblib
import os
from dotenv import load_dotenv

load_dotenv()
server = os.getenv("DB_HOST") or os.getenv("DB_SERVER", "localhost")
port = os.getenv("DB_PORT", "5432")
database = os.getenv("DB_NAME")
username = os.getenv("DB_USER")
password = os.getenv("DB_PASSWORD")

conn = psycopg.connect(
    dbname=database,
    user=username,
    password=password,
    host=server,
    port=port,
)


print("Đang nạp AI...")
model = joblib.load('../../MODELS/best_model_XGBoost.pkl')
scaler = joblib.load('../../MODELS/scaler.pkl')
feature_columns = joblib.load('../../MODELS/feature_columns.pkl')
threshold = joblib.load('../../MODELS/optimal_threshold.pkl')

# ==========================
# 3. Đọc dữ liệu SQL
# ==========================
print("Đang đọc dữ liệu từ PostgreSQL...")
df = pd.read_sql("SELECT * FROM customers", conn)

if df.empty:
    print("Không có dữ liệu.")
    conn.close()
    exit()

print(f"Tìm thấy {len(df)} khách hàng")

# ==========================
# 4. Tiền xử lý dữ liệu 
# ==========================
customer_ids = df["customer_id"].copy()

# Xóa các cột AI không học
drop_cols = ["customer_id", "surname", "complain", "cluster_label", "created_at"]
df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors='ignore')

# Đổi tên cột cho khớp AI
if 'card_type' in df.columns:
    df = df.rename(columns={'card_type': 'Card Type'})

# ---- CÔNG THỨC CHẾ BIẾN CỦA AI ----
df['Is_Zero_Balance'] = (df['balance'] == 0).astype(int)
df['Balance_per_Product'] = df['balance'] / df['num_of_products'].replace(0, 1)
df['Engagement_Score'] = df['is_active_member'] * df['num_of_products']
df['Age_Group'] = pd.cut(df['age'], bins=[0, 30, 45, 60, 100], labels=['18-30', '31-45', '46-60', '60+'])
# -----------------------------------

# One Hot Encoding
df_encoded = pd.get_dummies(df)

# Bổ sung các cột thiếu bằng 0
for col in feature_columns:
    if col not in df_encoded.columns:
        df_encoded[col] = 0

# Sắp xếp đúng thứ tự
df_encoded = df_encoded[feature_columns]

# ==========================
# 5. Scale dữ liệu
# ==========================
if hasattr(scaler, "feature_names_in_"):
    scaler_cols = scaler.feature_names_in_
    df_encoded[scaler_cols] = scaler.transform(df_encoded[scaler_cols])
else:
    df_encoded = scaler.transform(df_encoded)

# ==========================
# 6. Predict Probability
# ==========================
probs = model.predict_proba(df_encoded)[:, 1]
predictions = (probs >= threshold).astype(int)

print("\n===== KẾT QUẢ DỰ ĐOÁN =====")
print(f"Khách hàng nguy cơ cao: {predictions.sum()}")
print(f"Khách hàng trung thành: {len(predictions) - predictions.sum()}")

# ==========================
# 7. Cập nhật Database
# ==========================
print("\nĐang lưu kết quả chuẩn xác xuống PostgreSQL...")
cursor = conn.cursor()

for i in range(len(customer_ids)):
    label = "Nguy cơ rời bỏ cao" if predictions[i] == 1 else "Khách hàng trung thành"
    cursor.execute(
        "UPDATE customers SET cluster_label = ? WHERE customer_id = ?",
        (label, int(customer_ids.iloc[i]))
    )

conn.commit()
conn.close()
print("HOÀN THÀNH!")