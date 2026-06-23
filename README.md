# Bank-Customer-Churn
Phân cụm tỷ lệ khách hàng rời bỏ dịch vụ

# Hướng dẫn chạy backend
database sử dụng SQL sever 
- đổi tên file env.example thành .env 
DB_SERVER=localhost
DB_NAME=CustomerChurnDB
DB_USER=your_username  # Tên đăng nhập SQL Server của bạn 
DB_PASSWORD=your_password  # Mật khẩu SQL Server của bạn

- kết nối database (không nên sử dụng file sql)
tạo database đặt tên: CustomerChurnDB
import file customers.csv vào DB CustomerChurnDB

- Mở terminal tại thư mục `/Backend`.
- Cài đặt thư viện: `pip install -r requirements.txt`.
- Chạy server: `uvicorn main:app --reload`.
- Truy cập Swagger UI để test API tại: `http://localhost:8000/docs`.

