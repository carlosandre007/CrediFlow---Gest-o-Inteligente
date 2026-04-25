export interface Card {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  bank: string;
  brand: string;
  color: string;
  balance?: number;
}

export interface Purchase {
  id: string;
  name: string;
  totalValue: number;
  installments: number;
  cardId: string;
  date: string;
  categoryId: string;
  status?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Installment {
  id: string;
  purchaseId: string;
  cardId: string;
  purchaseName: string;
  installmentNumber: number;
  totalInstallments: number;
  value: number;
  date: string; // The estimated date of the invoice it belongs to
  month: number; // 0-11
  year: number;
}

export enum InvoiceStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  OVERPAID = 'OVERPAID'
}

export interface Invoice {
  id: string;
  cardId: string;
  month: number;
  year: number;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  paidAt?: string;
}

export interface CardAdjustment {
  id: string;
  cardId: string;
  amount: number;
  type: 'OVERPAYMENT' | 'UNDERPAYMENT' | 'REFUND' | 'MANUAL_ADJUSTMENT';
  description?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'purchase' | 'card' | 'system';
  date: string;
  read: boolean;
}

export interface FinancialState {
  cards: Card[];
  purchases: Purchase[];
  categories: Category[];
  invoices: Invoice[]; 
  cardAdjustments: CardAdjustment[];
  notifications: AppNotification[];
}
