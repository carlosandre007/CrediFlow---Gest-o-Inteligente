import { useMemo } from 'react';
import { FinancialState, Installment } from '../types';
import { addMonths, startOfDay } from 'date-fns';

const BANK_INTEREST_RATES: Record<string, number> = {
  'nubank': 0.12,
  'itau': 0.145,
  'bradesco': 0.143,
  'santander': 0.146,
  'banco_do_brasil': 0.12,
  'caixa': 0.11,
  'c6': 0.15,
  'inter': 0.13,
  'default': 0.14
};

export function useFinancialStrategy(state: FinancialState, allInstallments: Installment[], daysToQuit: number) {
  const today = startOfDay(new Date());
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // 1. Pending Installments (ignoring paid ones)
  const pendingInstallments = useMemo(() => {
    if (!allInstallments || !state.purchases) return [];
    return allInstallments.filter(inst => {
      const purchase = state.purchases.find(p => p.id === inst.purchaseId);
      if (purchase?.status === 'paid') return false;
      if (inst.value <= 0) return false;
      
      const isPaid = state.invoices?.some(i => 
        i.cardId === inst.cardId && 
        i.month === inst.month + 1 && 
        i.year === inst.year &&
        (i.status === 'PAID' || i.status === 'OVERPAID')
      );
      
      return !isPaid;
    });
  }, [allInstallments, state.purchases, state.invoices]);

  // Total Positive Balance
  const totalPositiveBalance = useMemo(() => {
    return state.cards.reduce((sum, c) => sum + (c.balance && c.balance > 0 ? c.balance : 0), 0);
  }, [state.cards]);

  // 2. Total Debt
  const totalDebt = useMemo(() => {
    const rawDebt = pendingInstallments.reduce((sum, inst) => sum + inst.value, 0);
    return Math.max(0, rawDebt - totalPositiveBalance);
  }, [pendingInstallments, totalPositiveBalance]);

  // 3. Current Invoice (for this month)
  const currentMonthInstallments = useMemo(() => {
    return pendingInstallments.filter(inst => {
      return inst.month === currentMonth && inst.year === currentYear;
    });
  }, [pendingInstallments, currentMonth, currentYear]);

  const currentInvoiceTotal = useMemo(() => {
    return currentMonthInstallments.reduce((sum, inst) => sum + inst.value, 0);
  }, [currentMonthInstallments]);

  // 4. Overdue (Past months not paid)
  const overdueInstallments = useMemo(() => {
    return pendingInstallments.filter(inst => {
      if (inst.year < currentYear) return true;
      if (inst.year === currentYear && inst.month < currentMonth) return true;
      return false;
    });
  }, [pendingInstallments, currentMonth, currentYear]);

  const overdueTotal = useMemo(() => {
    return overdueInstallments.reduce((sum, inst) => sum + inst.value, 0);
  }, [overdueInstallments]);

  // 5. Minimum Payments (15% of current invoice + 100% of overdue)
  const minimumPayments = useMemo(() => {
    return (currentInvoiceTotal * 0.15) + overdueTotal;
  }, [currentInvoiceTotal, overdueTotal]);

  // 6. Extra Income Calculator
  const extraIncomeStrategy = useMemo(() => {
    if (daysToQuit <= 0) return { daily: 0, totalWithInterest: totalDebt, interestDiff: 0 };
    
    // Average interest rate if paying minimum
    const avgInterest = 0.14; 
    const monthsToQuit = daysToQuit / 30;
    
    // Simplistic interest calculation for minimum payments
    // If paying minimum, debt grows. Let's show difference.
    const totalWithInterest = totalDebt * Math.pow(1 + avgInterest, monthsToQuit);
    const interestDiff = totalWithInterest - totalDebt;
    
    return {
      daily: totalDebt / daysToQuit,
      totalWithInterest,
      interestDiff
    };
  }, [totalDebt, daysToQuit]);

  // 7. Debt Health (Essential vs Superfluous)
  const debtHealth = useMemo(() => {
    let necessary = 0;
    let superfluous = 0;

    pendingInstallments.forEach(inst => {
      const purchase = state.purchases.find(p => p.id === inst.purchaseId);
      if (!purchase) return;
      
      const isRecurring = purchase.installments > 1;
      const isHighValue = purchase.totalValue > 500;
      
      if (isRecurring || isHighValue) {
        superfluous += inst.value;
      } else {
        necessary += inst.value;
      }
    });

    return { necessary, superfluous };
  }, [pendingInstallments, state.purchases]);

  // 8. Quit Score (0-100)
  const quitScore = useMemo(() => {
    const totalLimit = state.cards.reduce((sum, c) => sum + (c.limit || 0), 0);
    const limitUsagePercent = totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0;
    
    // Assumed monthly income based on limits or manual input. Let's use totalLimit * 0.8 as a heuristic.
    const assumedIncome = totalLimit * 0.8 || 3000;
    const debtIncomeRatio = (currentInvoiceTotal / assumedIncome) * 100;
    
    const overdueCount = overdueInstallments.length;
    
    let score = 100 - (limitUsagePercent * 0.3) - (debtIncomeRatio * 0.4) - (overdueCount * 10);
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [state.cards, totalDebt, currentInvoiceTotal, overdueInstallments]);

  // 9. Insights
  const insights = useMemo(() => {
    const alerts: { id: string, title: string, message: string, type: 'danger' | 'warning' | 'success' | 'info' }[] = [];
    
    // High Limit Usage
    const totalLimit = state.cards.reduce((sum, c) => sum + (c.limit || 0), 0);
    if (totalLimit > 0 && (totalDebt / totalLimit) > 0.8) {
      alerts.push({
        id: 'limit',
        title: 'Alto Risco',
        message: 'Seu limite global está quase esgotado (> 80%). Evite novas compras.',
        type: 'danger'
      });
    }

    // Overdue
    if (overdueTotal > 0) {
      alerts.push({
        id: 'overdue',
        title: 'Faturas Atrasadas',
        message: `Você tem R$ ${overdueTotal.toFixed(2)} em atraso. Os juros rotativos são agressivos!`,
        type: 'danger'
      });
    }

    // Upcoming
    state.cards.forEach(card => {
      let dueDate = new Date(currentYear, currentMonth, card.dueDay);
      if (card.dueDay < card.closingDay) {
        dueDate = addMonths(dueDate, 1);
      }
      const daysToDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      const cardCurrentInv = currentMonthInstallments.filter(i => i.cardId === card.id).reduce((s, i) => s + i.value, 0);
      
      if (daysToDue >= 0 && daysToDue <= 5 && cardCurrentInv > 0) {
        alerts.push({
          id: `due-${card.id}`,
          title: `Vencimento Próximo`,
          message: `Priorize o pagamento do cartão ${card.name} (vence em ${daysToDue} dias).`,
          type: 'warning'
        });
      }
    });

    // Positive Balance
    if (totalPositiveBalance > 0) {
      alerts.push({
        id: 'credit',
        title: 'Saldo de Crédito',
        message: `Você possui um crédito de R$ ${totalPositiveBalance.toFixed(2)} abater em faturas futuras.`,
        type: 'success'
      });
    }

    // Minimum Payment Impact
    if (currentInvoiceTotal > 0 && totalDebt > currentInvoiceTotal * 1.5) {
      alerts.push({
        id: 'min-impact',
        title: 'Cuidado com Rotativo',
        message: 'Você tem alto volume futuro. Pagar apenas o mínimo este mês vai gerar juros massivos.',
        type: 'info'
      });
    }

    return alerts;
  }, [state.cards, totalDebt, overdueTotal, currentMonthInstallments, totalPositiveBalance, currentInvoiceTotal, currentMonth, currentYear, today]);

  // 10. Future Projection
  const chartData = useMemo(() => {
    const data = [];
    let carryBalance = totalPositiveBalance;

    for (let i = 0; i < 12; i++) {
      const d = addMonths(today, i);
      const monthDebt = pendingInstallments
        .filter(inst => inst.month === d.getMonth() && inst.year === d.getFullYear())
        .reduce((sum, n) => sum + n.value, 0);
      
      let finalDebt = monthDebt;
      if (carryBalance > 0) {
        if (carryBalance >= monthDebt) {
          carryBalance -= monthDebt;
          finalDebt = 0;
        } else {
          finalDebt -= carryBalance;
          carryBalance = 0;
        }
      }

      data.push({
        name: `${d.getMonth() + 1}/${d.getFullYear()}`,
        valor: finalDebt
      });
    }
    return data;
  }, [pendingInstallments, totalPositiveBalance, today]);

  // 11. Payment Strategy Priority
  const paymentPriority = useMemo(() => {
    const cardsWithDebt = state.cards.map(card => {
      const insts = currentMonthInstallments.filter(i => i.cardId === card.id);
      const overdueInsts = overdueInstallments.filter(i => i.cardId === card.id);
      
      const monthDebt = insts.reduce((sum, i) => sum + i.value, 0);
      const overdueDebt = overdueInsts.reduce((sum, i) => sum + i.value, 0);
      
      const interestRate = BANK_INTEREST_RATES[card.bank?.toLowerCase() || 'default'] || 0.14;
      
      let dueDate = new Date(currentYear, currentMonth, card.dueDay);
      if (card.dueDay < card.closingDay) {
        dueDate = addMonths(dueDate, 1);
      }
      const daysToDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

      return {
        card,
        debt: Math.max(0, monthDebt + overdueDebt - (card.balance || 0)),
        isOverdue: overdueDebt > 0 || daysToDue < 0,
        daysToDue,
        interestRate
      };
    }).filter(c => c.debt > 0);

    return cardsWithDebt.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      
      if (a.interestRate !== b.interestRate) {
        return b.interestRate - a.interestRate;
      }
      
      return a.daysToDue - b.daysToDue;
    });
  }, [state.cards, currentMonthInstallments, overdueInstallments, currentYear, currentMonth, today]);

  return {
    totalDebt,
    currentInvoiceTotal,
    overdueTotal,
    minimumPayments,
    extraIncomeStrategy,
    debtHealth,
    quitScore,
    insights,
    chartData,
    paymentPriority
  };
}
