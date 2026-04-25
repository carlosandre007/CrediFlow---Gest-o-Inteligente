import { addMonths, getDate, getMonth, getYear, setDate, isAfter } from 'date-fns';
import { Card, Installment, Purchase } from '../types';

/**
 * Calculates which invoice an installment belongs to based on card closing day.
 */
export function getInstallmentInvoiceDate(purchaseDate: Date, card: Card, installmentIdx: number): Date {
  const purchaseDay = getDate(purchaseDate);
  const purchaseMonth = getMonth(purchaseDate);
  const purchaseYear = getYear(purchaseDate);

  // If purchase is after (or on?) closing day, it goes to the NEXT invoice.
  // Standard rule: purchase day > closing day => next month.
  // Note: some cards have a "best day" which is closing day.
  let targetMonthOffset = purchaseDay >= card.closingDay ? 1 : 0;
  
  // Add the installment specific offset
  targetMonthOffset += installmentIdx;

  const invoiceDate = addMonths(new Date(purchaseYear, purchaseMonth, 1), targetMonthOffset);
  return invoiceDate;
}

export function generateInstallments(purchase: Purchase, card: Card): Installment[] {
  const installments: Installment[] = [];
  const installmentValue = purchase.totalValue / purchase.installments;
  const pDate = new Date(purchase.date);

  for (let i = 0; i < purchase.installments; i++) {
    const invoiceDate = getInstallmentInvoiceDate(pDate, card, i);
    const month = getMonth(invoiceDate);
    const year = getYear(invoiceDate);

    installments.push({
      id: `${purchase.id}-${i + 1}`,
      purchaseId: purchase.id,
      cardId: card.id,
      purchaseName: purchase.name,
      installmentNumber: i + 1,
      totalInstallments: purchase.installments,
      value: installmentValue,
      date: invoiceDate.toISOString(),
      month,
      year,
    });
  }

  return installments;
}
