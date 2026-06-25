from dataclasses import dataclass
from typing import Optional

@dataclass
class PredictionRecord:
    customer_id: int
    surname: str
    timestamp: str
    age: int
    balance: float
    probability: float
    status: str
    id: Optional[str] = None