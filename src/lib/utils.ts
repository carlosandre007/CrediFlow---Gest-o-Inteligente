import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInDays, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';

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

export function getDueStatus(dueDate: Date | string) {
  if (!dueDate) return { label: 'Data inválida', color: 'bg-slate-100 text-slate-600 border-slate-200', variant: 'invalid' };
  
  const date = new Date(dueDate);
  if (isNaN(date.getTime())) return { label: 'Data inválida', color: 'bg-slate-100 text-slate-600 border-slate-200', variant: 'invalid' };

  const today = startOfDay(new Date());
  const targetDate = startOfDay(date);
  
  const diff = differenceInDays(targetDate, today);

  if (diff < 0) {
    const pastDiff = Math.abs(diff);
    return {
      label: `Vencida há ${pastDiff} dia${pastDiff > 1 ? 's' : ''}`,
      color: 'bg-rose-100 text-rose-600 border-rose-200',
      variant: 'overdue' as const,
      icon: 'alert'
    };
  }

  if (diff === 0) {
    return {
      label: 'Vence hoje',
      color: 'bg-orange-100 text-orange-600 border-orange-200',
      variant: 'today' as const,
      icon: 'clock'
    };
  }

  return {
    label: `Vence em ${diff} dia${diff > 1 ? 's' : ''}`,
    color: 'bg-blue-100 text-blue-600 border-blue-200',
    variant: 'soon' as const,
    icon: 'calendar'
  };
}
