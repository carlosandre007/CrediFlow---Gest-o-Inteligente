export interface Card {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  bank: string;
  brand: string;
  color: string;
}

export interface Purchase {
  id: string;
  name: string;
  totalValue: number;
  installments: number;
  cardId: string;
  date: string;
  categoryId: string;
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
  OPEN = 'Aberta',
  CLOSED = 'Fechada',
  PAID = 'Paga',
}

export interface Invoice {
  cardId: string;
  month: number;
  year: number;
  status: InvoiceStatus;
  installments: Installment[];
  total: number;
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
  paidInvoices: string[]; // List of cardId-month-year
  notifications: AppNotification[];
}
