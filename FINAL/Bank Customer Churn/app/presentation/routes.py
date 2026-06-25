from flask import Blueprint, jsonify, render_template
from flask_cors import CORS
from app.infrastructure.persistence.json_history_repo import JsonHistoryRepository

churn_blueprint = Blueprint('churn_api', __name__)
CORS(churn_blueprint) # Hỗ trợ gọi API chéo từ frontend độc lập

history_repo = JsonHistoryRepository()

@churn_blueprint.route('/')
def index():
    return render_template('dashboard.html')

@churn_blueprint.route('/api/history', methods=['GET'])
def get_history_dashboard():
    try:
        records = history_repo.get_all()
        return jsonify([r.__dict__ for r in records]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500