import json
import os
from app.domain.models import PredictionRecord

class JsonHistoryRepository:
    def __init__(self, file_path='prediction_history.json'):
        self.file_path = file_path

    def _read_file(self):
        if not os.path.exists(self.file_path):
            return []
        with open(self.file_path, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []

    def save(self, record: PredictionRecord):
        data = self._read_file()
        data.insert(0, record.__dict__)
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)

    def get_all(self):
        data = self._read_file()
        return [PredictionRecord(**item) for item in data]
