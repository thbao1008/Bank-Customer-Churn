import pandas as pd
import numpy as np
from datetime import datetime

# Số lượng dòng dữ liệu bạn muốn tạo
num_rows = 100 

# Sinh dữ liệu ngẫu nhiên nhưng logic
np.random.seed(42) # Giữ cố định để kết quả không đổi mỗi lần chạy

data = {
    'id': range(1, num_rows + 1),
    'customer_id': np.random.randint(15500000, 15800000, size=num_rows),
    'surname': np.random.choice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'], size=num_rows),
    'credit_score': np.random.randint(400, 850, size=num_rows),
    'geography': np.random.choice(['France', 'Spain', 'Germany'], size=num_rows),
    'gender': np.random.choice(['Female', 'Male'], size=num_rows),
    'age': np.random.randint(18, 80, size=num_rows),
    'tenure': np.random.randint(0, 11, size=num_rows),
    'balance': np.round(np.random.uniform(0, 20000000, size=num_rows), 2),
    'num_of_products': np.random.randint(1, 5, size=num_rows),
    'has_cr_card': np.random.choice([0, 1], size=num_rows),
    'is_active_member': np.random.choice([0, 1], size=num_rows),
    'estimated_salary': np.round(np.random.uniform(500000, 15000000, size=num_rows), 2),
    'exited': np.random.choice([0, 1], size=num_rows, p=[0.8, 0.2]), # Tỷ lệ rời bỏ khoảng 20%
    'complain': np.random.choice([0, 1], size=num_rows, p=[0.8, 0.2]),
    'satisfaction_score': np.random.randint(1, 6, size=num_rows),
    'card_type': np.random.choice(['DIAMOND', 'GOLD', 'SILVER', 'PLATINUM'], size=num_rows),
    'point_earned': np.random.randint(100, 1000, size=num_rows),
    'cluster_label': np.random.choice(['Nguy cơ rời bỏ cao', 'Khách hàng trung thành', 'Khách hàng tiềm năng'], size=num_rows),
    'created_at': [datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]] * num_rows
}

# Tạo DataFrame và xuất ra file CSV
df_new = pd.DataFrame(data)
df_new.to_csv('customers_new.csv', index=False)
print("Đã tạo xong file 'customers_new.csv'!")