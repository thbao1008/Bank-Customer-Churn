from app import create_app

# Khởi tạo ứng dụng từ cấu trúc Clean Architecture
app = create_app()

if __name__ == '__main__':
    print("🚀 Máy chủ đang khởi động tại địa chỉ http://127.0.0.1:5000")
    # Chạy ứng dụng tại port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)