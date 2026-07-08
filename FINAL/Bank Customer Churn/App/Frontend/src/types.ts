export type PredictionResult = {
  customer_id: number
  surname: string
  geography: string
  prediction_result: string
  probability: number
  database_status?: string
}

export type SavedPrediction = {
  id: string
  session_id?: string
  name: string
  source: 'single' | 'csv'
  result?: PredictionResult
  csvResults?: PredictionResult[]
  timestamp: string
}

export type CustomerData = {
  customer_id: number
  surname: string
  credit_score: number
  geography: string
  gender: string
  age: number
  tenure: number
  balance: number
  num_of_products: number
  has_cr_card: number
  is_active_member: number
  estimated_salary: number
  complain: number
  satisfaction_score: number
  card_type: string
  point_earned: number
}

export type ModelPerformance = {
  name: string
  accuracy: number
  precision: number
  recall: number
  f1: number
  rocAuc: number
}

export type TuningSummaryItem = {
  name: string
  value: string
  detail: string
}

export type ExperimentSummary = {
  bestModel: string
  recommendation: string
  confusionMatrix: {
    tp: number
    fp: number
    fn: number
    tn: number
  }
}

export type ResultTab = 'detail' | 'summary' | 'list'
export type ViewMode = 'predict-single' | 'predict-csv' | 'history' | 'dashboard'
