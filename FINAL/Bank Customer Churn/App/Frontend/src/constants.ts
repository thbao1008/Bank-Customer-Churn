import type { CustomerData, PredictionResult } from './types'

export const initialCustomer: CustomerData = {
  customer_id: 1,
  surname: 'Nguyen',
  credit_score: 650,
  geography: 'France',
  gender: 'Male',
  age: 35,
  tenure: 3,
  balance: 50000,
  num_of_products: 1,
  has_cr_card: 1,
  is_active_member: 1,
  estimated_salary: 60000,
  complain: 0,
  satisfaction_score: 3,
  card_type: 'Gold',
  point_earned: 100,
}

export const fieldLabels: Record<keyof CustomerData, string> = {
  customer_id: 'Customer ID',
  surname: 'Họ tên',
  credit_score: 'Credit Score',
  geography: 'Quốc gia',
  gender: 'Giới tính',
  age: 'Tuổi',
  tenure: 'Thời gian thuê',
  balance: 'Số dư',
  num_of_products: 'Số sản phẩm',
  has_cr_card: 'Có thẻ tín dụng',
  is_active_member: 'Thành viên hoạt động',
  estimated_salary: 'Lương ước tính',
  complain: 'Số khiếu nại',
  satisfaction_score: 'Mức hài lòng',
  card_type: 'Loại thẻ',
  point_earned: 'Điểm tích lũy',
}

export const buildPredictionResult = (customer: CustomerData): PredictionResult => {
  let riskScore = 0
  if (customer.age < 30) riskScore -= 0.15
  if (customer.age > 50) riskScore += 0.2
  if (customer.tenure > 5) riskScore -= 0.2
  if (customer.has_cr_card === 1) riskScore -= 0.1
  if (customer.is_active_member === 1) riskScore -= 0.15
  if (customer.complain > 0) riskScore += 0.3
  if (customer.satisfaction_score < 2) riskScore += 0.25
  const probability = 1 / (1 + Math.exp(-riskScore))
  return {
    customer_id: customer.customer_id,
    surname: customer.surname,
    geography: customer.geography,
    prediction_result: probability > 0.5 ? 'Nguy cơ rời bỏ cao' : 'Khách hàng trung thành',
    probability: Math.max(0.01, Math.min(0.99, probability)),
    database_status: 'Demo mode',
  }
}
