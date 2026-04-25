import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatCurrencyMask(value: string) {
  const digits = value.replace(/\D/g, '');
  const numberValue = Number(digits) / 100;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function parseCurrency(value: string): number {
  return Number(value.replace(/\D/g, '')) / 100;
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}
