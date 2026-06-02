import type { CreatePaymentApiBody } from '@/lib/validations/payment-validations'

export type CreatePaymentInput = Omit<CreatePaymentApiBody, 'date'> & {
  date: Date
}
