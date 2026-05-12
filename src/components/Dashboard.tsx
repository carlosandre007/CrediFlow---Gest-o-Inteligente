import React, { useMemo, useState, useCallback } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  CreditCard, 
  Calendar,
  AlertCircle,
  HelpCircle,
  Wallet,
  Zap,
  Target,
  PiggyBank,
  Receipt,
  Upload,
  Edit2,
  Trash2,
  Plus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { FinancialState, Installment, Card } from '../types';
import { formatCurrency, cn, getDueStatus } from '../lib/utils';
import { CSVImporter } from './CSVImporter';
import { startOfMonth, subMonths, format, addMonths, isWithinInterval, addDays, set, isSameMonth, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface DashboardProps {
  state: FinancialState;
  installments: Installment[];
  onAddPurchase: () => void;
  onEditPurchase: (purchase: any) => void;
  onDeletePurchase: (id: string) => Promise<void>;
  payInvoice: (cardId: string, month: number, year: number, totalAmount: number, paidAmount: number) => Promise<void>;
  bulkImportPurchases: (purchases: any[]) => Promise<void>;
}

// Utilitário para descobrir o ciclo exato do cartão em um dado mês alvo
function getCardCycleForMonth(card: Card, targetMonth: Date) {
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();

  let start = new Date(year, month, card.closingDay);
  start = subMonths(start, 1);

  let end = new Date(year, month, card.closingDay);
  let due = new Date(year, month, card.dueDay);

  if (card.dueDay < card.closingDay) {
    due = addMonths(due, 1);
  }

  return { start, end, due };
}

export function Dashboard({ state, installments = [], onAddPurchase, onEditPurchase, onDeletePurchase, payInvoice, bulkImportPurchases }: DashboardProps) {
  if (!state || !state.cards) {
    return <div className="p-8 text-center text-slate-500">Carregando dados do dashboard...</div>;
  }

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showBulkOptions, setShowBulkOptions] = useState(false);

  const [selectedCardForDetail, setSelectedCardForDetail] = useState<Card | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [paymentModalCard, setPaymentModalCard] = useState<{ card: Card, invoiceValue: number, month: number, year: number } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const today = startOfDay(new Date());
  const next6Days = endOfDay(addDays(today, 6));

  const handlePrevMonth = () => setSelectedMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setSelectedMonth(prev => addMonths(prev, 1));

  // 1. Somente parcelas de compras que NÃO estão marcadas como pagas e filtrando Invoices pagos
  const pendingInstallments = useMemo(() => {
    if (!installments || !state.purchases) return [];
    return installments.filter(inst => {
      const purchase = state.purchases.find(p => p.id === inst.purchaseId);
      if (purchase?.status === 'paid') return false;
      if (inst.value <= 0) return false;
      
      const card = state.cards.find(c => c.id === inst.cardId);
      if (!card) return false;

      // Usamos diretamente o mês e ano da parcela que já foram calculados 
      // na função generateInstallments (finance.ts) levando em conta o fechamento.
      const invMonth = inst.month + 1; // Convertendo 0-11 para 1-12
      const invYear = inst.year;

      // Verifica se a invoice dessa data já está paga/fechada no banco
      const isPaid = state.invoices?.some(i => 
        i.cardId === inst.cardId && 
        i.month === invMonth && 
        i.year === invYear &&
        (i.status === 'PAID' || i.status === 'OVERPAID')
      );
      
      return !isPaid;
    });
  }, [installments, state.purchases, state.cards, state.invoices]);

  // Total de Saldo Positivo Global
  const totalPositiveBalance = useMemo(() => {
    return state.cards.reduce((sum, c) => sum + (c.balance && c.balance > 0 ? c.balance : 0), 0);
  }, [state.cards]);

  // 2. Dívida Total: Soma de TODAS as parcelas pendentes MENOS os saldos positivos
  const totalDebt = useMemo(() => {
    const rawDebt = pendingInstallments.reduce((sum, inst) => sum + inst.value, 0);
    return Math.max(0, rawDebt - totalPositiveBalance);
  }, [pendingInstallments, totalPositiveBalance]);

  // 3. Limite Disponível Global
  const globalLimitStats = useMemo(() => {
    const totalLimit = state.cards.reduce((sum, card) => sum + (card.limit || 0), 0);
    const available = Math.max(0, totalLimit - totalDebt);
    return {
      total: totalLimit,
      available,
      usagePercent: totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0
    };
  }, [state.cards, totalDebt]);

  // 4. Parcelas do Mês Selecionado baseadas no Ciclo e Vencimento
  const currentMonthInstallments = useMemo(() => {
    return pendingInstallments.filter(inst => {
      // Como a parcela (Installment) já contém month e year corretos definidos
      // pela função `generateInstallments` baseada no closingDay, basta comparar:
      return inst.month === selectedMonth.getMonth() && inst.year === selectedMonth.getFullYear();
    });
  }, [pendingInstallments, selectedMonth]);

  // Fatura Atual Global (apenas do mês selecionado) reduzindo o saldo positivo se sobrar
  const currentInvoiceGlobal = useMemo(() => {
    const rawSum = currentMonthInstallments.reduce((sum, inst) => sum + inst.value, 0);
    // Para simplificar a view global, apenas mostramos a soma
    return Math.max(0, rawSum);
  }, [currentMonthInstallments]);

  // 5. Consolidado por Cartão
  const cardData = useMemo(() => {
    if (!state.cards) return [];
    
    return state.cards.map(card => {
      // Valor da fatura NO MÊS SELECIONADO para este cartão
      const baseInvoice = currentMonthInstallments
        .filter(inst => inst.cardId === card.id)
        .reduce((sum, inst) => sum + inst.value, 0);

      // Aplica o Saldo do Cartão (balance)
      const balance = card.balance || 0;
      let currentInvoice = baseInvoice;

      if (balance > 0) {
        currentInvoice = Math.max(0, baseInvoice - balance);
      } else if (balance < 0) {
        // Se tem divida pendente, ela soma na fatura do mês atual se ela for exibida. 
        // Para simplificar, sempre somamos a dívida anterior (negativa no balance).
        currentInvoice = baseInvoice + Math.abs(balance);
      }

      // Total já comprometido (todas as parcelas futuras) deste cartão
      const totalUsedOnCard = pendingInstallments
        .filter(inst => inst.cardId === card.id)
        .reduce((sum, inst) => sum + inst.value, 0);

      const limit = card.limit || 0;
      const usage = limit > 0 ? (totalUsedOnCard / limit) * 100 : 0;
      const available = Math.max(0, limit - totalUsedOnCard + (balance > 0 ? balance : 0));

      const cycle = getCardCycleForMonth(card, selectedMonth);
      
      return {
        id: card.id,
        name: card.name,
        color: card.color || '#64748b',
        fullLimit: limit,
        value: totalUsedOnCard,
        currentInvoice,
        usage,
        available,
        cycle
      };
    }).filter(c => c.currentInvoice > 0);
  }, [state.cards, pendingInstallments, currentMonthInstallments, selectedMonth]);

  // Alertas de Vencimento: Agrupa parcelas pendentes por cartão e fatura para identificar vencimentos reais
  const dueSoonCards = useMemo(() => {
    if (!state.cards || !pendingInstallments.length) return [];

    const alerts: (Card & { dueDate: Date, totalValue: number })[] = [];

    // Agrupar parcelas por cartão e competência (mês/ano)
    const groups: Record<string, { total: number, card: Card, month: number, year: number }> = {};

    pendingInstallments.forEach(inst => {
      const card = state.cards.find(c => c.id === inst.cardId);
      if (!card) return;

      const key = `${inst.cardId}-${inst.month}-${inst.year}`;
      if (!groups[key]) {
        groups[key] = { total: 0, card, month: inst.month, year: inst.year };
      }
      groups[key].total += inst.value;
    });

    Object.values(groups).forEach(group => {
      const { card, month, year, total } = group;
      
      // Calcular a data de vencimento real daquela fatura específica
      // Regra: Se dueDay < closingDay, o vencimento é no mês seguinte ao fechamento.
      // No sistema, inst.month já reflete o mês da fatura (fechamento).
      let dueDate = new Date(year, month, card.dueDay);
      
      if (card.dueDay < card.closingDay) {
        dueDate = addMonths(dueDate, 1);
      }

      const diff = differenceInDays(startOfDay(dueDate), today);

      // Critério: Vencido (diff < 0) ou vence nos próximos 10 dias
      if (diff <= 10 && total > 0) {
        alerts.push({
          ...card,
          dueDate,
          totalValue: total
        });
      }
    });

    return alerts;
  }, [state.cards, pendingInstallments, today]);

  // Chart data: 6 meses a partir do selecionado
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 6; i++) {
        const targetMonthDate = addMonths(selectedMonth, i);
        const total = pendingInstallments
            .filter(inst => isSameMonth(new Date(inst.date), targetMonthDate))
            .reduce((sum, inst) => sum + inst.value, 0);
            
        data.push({
            name: format(targetMonthDate, 'MMM', { locale: ptBR }),
            valor: total,
        });
    }
    return data;
  }, [pendingInstallments, selectedMonth]);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Resumo Financeiro</h2>
          <div className="flex items-center gap-4 mt-2">
            <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <span className="font-bold text-violet-600 text-lg min-w-[120px] text-center capitalize">
              {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowBulkOptions(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 active:scale-95"
            >
              <Upload size={18} />
              <span>Adição em Massa</span>
            </button>
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-slate-400 leading-none mb-1">Score CrediFlow</p>
                <p className="font-bold text-emerald-600">842</p>
              </div>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Dívida Total" 
          value={formatCurrency(totalDebt)} 
          subLabel="Total em parcelas"
          icon={Wallet}
          color="violet"
        />
        <StatCard 
          label="Limite Disponível" 
          value={formatCurrency(globalLimitStats.available)} 
          subLabel={`De ${formatCurrency(globalLimitStats.total)} total`}
          icon={PiggyBank}
          color="emerald"
        />
        <StatCard 
          label="Fatura Atual" 
          value={formatCurrency(currentInvoiceGlobal)} 
          subLabel={`Em ${format(selectedMonth, 'MMM', { locale: ptBR })}`}
          icon={CreditCard}
          color="blue"
        />
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-violet-200 transition-colors cursor-pointer" onClick={onAddPurchase}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap size={20} />
            </div>
            <ArrowUpRight className="text-slate-200" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Atalho Rápido</h3>
            <p className="text-lg font-bold text-slate-800">Nova Compra</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Evolução */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-bold text-slate-800">Evolução da Dívida</h3>
                <p className="text-sm text-slate-500">Próximos 6 meses</p>
              </div>
           </div>
           <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(value) => `R$ ${value}`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [formatCurrency(value), 'Valor']} />
                    <Bar dataKey="valor" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={40} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Uso de Limite */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
           <h3 className="font-bold text-slate-800 mb-6">Uso de Limite</h3>
           <div className="space-y-6 flex-1">
              {cardData.map((card, idx) => (
                <div key={idx} className="space-y-2 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors" onClick={() => setSelectedCardForDetail(state.cards.find(c => c.id === card.id) || null)}>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }}></div>
                       <span className="font-medium text-slate-700">{card.name}</span>
                    </div>
                    <span className="text-slate-500">{Math.round(card.usage)}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                     <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(card.usage, 100)}%` }} className={cn("h-full rounded-full transition-all duration-1000", card.usage > 90 ? "bg-rose-500" : card.usage > 70 ? "bg-amber-500" : "bg-violet-500")} style={{ backgroundColor: card.usage <= 70 ? card.color : undefined }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>{formatCurrency(card.value)} usado</span>
                    <span>Total: {formatCurrency(card.fullLimit)}</span>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Destaques da Fatura Atual (Corrigido para usar ciclos reais de cada cartão) */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Destaques da Fatura</h3>
           </div>
           <div className="space-y-4">
              {(() => {
                const highlights = currentMonthInstallments.slice(0, 5);

                if (highlights.length === 0) return <p className="text-slate-400 text-sm text-center py-8">Nenhum lançamento para {format(selectedMonth, 'MMM/yyyy')}.</p>;

                return highlights.map((inst, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <Receipt size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{inst.purchaseName}</p>
                        <p className="text-xs text-slate-400">Parcela {inst.installmentNumber}/{inst.totalInstallments}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800 text-sm">{formatCurrency(inst.value)}</p>
                      <p className="text-[10px] text-slate-400">{format(new Date(inst.date), 'dd/MM')}</p>
                    </div>
                  </div>
                ));
              })()}
           </div>
         </div>

         {/* Alertas de Vencimento */}
         <div className="space-y-6">
            {dueSoonCards.length > 0 && (
              <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl">
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-rose-900 mb-3">Vencendo nos próximos 6 dias</h4>
                      <div className="space-y-3">
                        {dueSoonCards.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).map((card) => {
                          if (!card.dueDate || isNaN(card.dueDate.getTime())) return null;
                          const status = getDueStatus(card.dueDate);
                          
                          return (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={`${card.id}-${card.dueDate.toISOString()}`} 
                              className="flex items-center justify-between bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-white/50 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: card.color }}></div>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: card.color }}>
                                  <CreditCard size={18} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800 group-hover:text-violet-600 transition-colors">{card.name}</p>
                                  <p className="text-[11px] text-slate-400 font-medium">Vence dia {format(card.dueDate, 'dd/MM')}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                <p className="text-sm font-black text-slate-900">{formatCurrency(card.totalValue)}</p>
                                <div className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm transition-all text-[10px] font-bold",
                                  status.color
                                )}>
                                  {status.icon === 'clock' && <Zap size={10} className="animate-pulse" />}
                                  {status.icon === 'alert' && <AlertCircle size={10} />}
                                  {status.icon === 'calendar' && <Calendar size={10} />}
                                  {status.label}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                 </div>
              </div>
            )}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg relative overflow-hidden text-white">
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-4">
                    <PiggyBank size={20} className="text-violet-200" />
                    <span className="text-sm font-medium text-violet-100">Dica de Quitação</span>
                 </div>
                 <h3 className="text-2xl font-bold mb-1">{formatCurrency(totalDebt / 60)} <span className="text-xs font-normal opacity-70">p/ dia</span></h3>
                 <p className="text-sm text-violet-200 mb-6">Para zerar suas dívidas em 2 meses.</p>
               </div>
               <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white opacity-10"></div>
            </div>
         </div>
      </div>

      {/* Detalhamento de Faturas por Cartão */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-8">
        <h3 className="font-bold text-slate-800 mb-6">Resumo de Faturas por Cartão</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardData.map((card, idx) => (
            <div key={idx} onClick={() => setSelectedCardForDetail(state.cards.find(c => c.id === card.id) || null)} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-violet-100 hover:shadow-md transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: card.color }}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{card.name}</h4>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-medium uppercase">Fatura</p>
                  <p className="text-sm font-black text-slate-800">{formatCurrency(card.currentInvoice)}</p>
                </div>
              </div>
              <div className="space-y-1.5 mt-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400">DISPONÍVEL</span>
                  <span className="text-emerald-600">{formatCurrency(card.available)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(card.usage, 100)}%` }} className="h-full rounded-full" style={{ backgroundColor: card.color }} />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3" onClick={(e) => e.stopPropagation()}>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Sugestão de Pagamento</p>
                  {(() => {
                    const invoice = card.currentInvoice;
                    const limit = card.fullLimit || 1;
                    const usageGlobal = card.usage;
                    let suggestText = "Ideal: 100%";
                    let suggestValue = invoice;

                    if (usageGlobal > 80) {
                      suggestText = "Estratégico: 70%";
                      suggestValue = invoice * 0.7;
                    }

                    return (
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">{suggestText}</span>
                        <span className="text-sm font-black text-indigo-600">{formatCurrency(suggestValue)}</span>
                      </div>
                    );
                  })()}
                </div>

                {(() => {
                  let dueDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), card.cycle.due.getDate());
                  if (card.cycle.due.getMonth() !== selectedMonth.getMonth()) {
                     dueDate = addMonths(dueDate, 1);
                  }
                  
                  // Aparece 5 dias antes e continua aparecendo enquanto estiver atrasada
                  const daysToDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                  const isDueSoon = daysToDue <= 5; // Aparece sempre que faltar 5 dias ou menos (mesmo atrasado)

                  if (card.currentInvoice > 0 && isDueSoon) {
                    return (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          const cardId = card.id;
                          const originalCard = state.cards.find(c => c.id === cardId);
                          
                          if (!originalCard) return;

                          const invMonth = selectedMonth.getMonth() + 1;
                          const invYear = selectedMonth.getFullYear();
                          
                          setPaymentModalCard({ 
                            card: originalCard, 
                            invoiceValue: card.currentInvoice, 
                            month: invMonth, 
                            year: invYear 
                          });
                          setPaymentAmount(card.currentInvoice.toString());
                        }}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95"
                      >
                        <CheckCircle size={16} /> Realizar Pagamento
                      </button>
                    );
                  }

                  if (card.currentInvoice === 0) {
                    // Verifica se já existia uma fatura paga para este mês
                    const invMonth = selectedMonth.getMonth() + 1;
                    const invYear = selectedMonth.getFullYear();
                    const hasPaidInvoice = state.invoices?.some(i => 
                      i.cardId === card.id && i.month === invMonth && i.year === invYear && (i.status === 'PAID' || i.status === 'OVERPAID')
                    );

                    if (hasPaidInvoice) {
                      return (
                        <div className="w-full py-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-bold rounded-xl flex items-center justify-center gap-2">
                          <CheckCircle size={16} /> Fatura Paga
                        </div>
                      );
                    }
                  }

                  return (
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddPurchase();
                      }}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Adicionar Gasto
                    </button>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Pagamento DIRETO (Sem AnimatePresence para isolar erro) */}
      {paymentModalCard && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div onClick={() => setPaymentModalCard(null)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: paymentModalCard.card.color }}>
                  <Wallet size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Pagamento</h3>
                  <p className="text-sm text-slate-500 font-medium">{paymentModalCard.card.name}</p>
                </div>
              </div>
              <button onClick={() => setPaymentModalCard(null)} className="text-slate-400 p-2">
                Fechar
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-sm text-slate-500 font-medium mb-1">Valor Total</p>
                 <p className="text-3xl font-black text-slate-800">{formatCurrency(paymentModalCard.invoiceValue)}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Valor Pago</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl outline-none transition-all text-slate-700 font-bold"
                />
              </div>

              <button 
                onClick={async () => {
                  const paid = parseFloat(paymentAmount);
                  if (isNaN(paid) || paid <= 0) return alert('Insira um valor válido');
                  
                  await payInvoice(
                    paymentModalCard.card.id,
                    paymentModalCard.month,
                    paymentModalCard.year,
                    paymentModalCard.invoiceValue,
                    paid
                  );
                  setPaymentModalCard(null);
                }}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Detalhes do Cartão */}
      <AnimatePresence>
        {selectedCardForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedCardForDetail(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: selectedCardForDetail.color }}>
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedCardForDetail.name}</h3>
                    <p className="text-sm text-slate-500 font-medium">Lançamentos da fatura em aberto</p>
                  </div>
                </div>
                <button onClick={() => setSelectedCardForDetail(null)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 shadow-sm">
                  <AlertCircle className="rotate-45" size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {(() => {
                  const filtered = currentMonthInstallments.filter(inst => inst.cardId === selectedCardForDetail.id);

                  return (
                    <>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Mês Selecionado</p>
                        <p className="text-sm font-bold text-slate-700 capitalize">{format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}</p>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Lançamentos Selecionados</h4>
                        {filtered.length === 0 ? (
                          <p className="text-center py-8 text-slate-400 text-sm">Nenhum lançamento para este período.</p>
                        ) : (
                          <div className="space-y-2">
                            {filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((inst, i) => (
                              <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-violet-100 transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
                                    <Receipt size={18} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800 text-sm">{inst.purchaseName}</p>
                                    <p className="text-xs text-slate-400">Parcela {inst.installmentNumber}/{inst.totalInstallments}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <div className="text-right">
                                    <p className="font-black text-slate-800 text-sm">{formatCurrency(inst.value)}</p>
                                    <p className="text-[10px] text-slate-400">{format(new Date(inst.date), 'dd/MM/yyyy')}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => {
                                        const p = state.purchases.find(p => p.id === inst.purchaseId);
                                        if (p) onEditPurchase(p);
                                      }}
                                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-violet-600 rounded-lg transition-colors"
                                      title="Editar"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button 
                                      onClick={async () => {
                                        if (confirm('Deseja excluir este lançamento completo?')) {
                                          await onDeletePurchase(inst.purchaseId);
                                        }
                                      }}
                                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setSelectedCardForDetail(null)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-95">Fechar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Opções de Adição em Massa */}
      <AnimatePresence>
        {showBulkOptions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkOptions(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-8">
               <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                     <Upload size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800">Como deseja importar?</h3>
                  <p className="text-slate-500">Escolha o método mais rápido para seus lançamentos.</p>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => {
                      setShowBulkOptions(false);
                      setIsImportModalOpen(true);
                    }}
                    className="flex items-center gap-6 p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-violet-200 hover:bg-violet-50/30 transition-all group text-left"
                  >
                    <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-violet-600 transition-colors">
                       <Receipt size={28} />
                    </div>
                    <div>
                       <p className="font-bold text-slate-800">Arquivo CSV / Excel</p>
                       <p className="text-xs text-slate-500">Ideal para exportações direto do banco.</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      setShowBulkOptions(false);
                      // Dispara o evento para o App.tsx abrir o scanner
                      const event = new CustomEvent('openScanner');
                      window.dispatchEvent(event);
                    }}
                    className="flex items-center gap-6 p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-violet-200 hover:bg-violet-50/30 transition-all group text-left"
                  >
                    <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-violet-600 transition-colors">
                       <Zap size={28} />
                    </div>
                    <div>
                       <p className="font-bold text-slate-800">Scanner de Fatura (IA)</p>
                       <p className="text-xs text-slate-500">Tire foto ou suba um PDF para leitura automática.</p>
                    </div>
                  </button>
               </div>

               <button 
                onClick={() => setShowBulkOptions(false)}
                className="w-full mt-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors"
               >
                 Cancelar
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isImportModalOpen && (
        <CSVImporter 
          cards={state.cards}
          categories={state.categories}
          existingPurchases={state.purchases}
          onImport={async (transactions) => {
            const mapped = transactions.map(t => ({
              name: t.description,
              totalValue: t.value,
              installments: t.installments,
              cardId: t.cardId,
              categoryId: t.categoryId,
              date: t.date.toISOString(),
            }));
            await bulkImportPurchases(mapped);
          }}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, subLabel, icon: Icon, color }: { label: string, value: string, subLabel: string, icon: any, color: string }) {
  const colors: any = {
    violet: "bg-violet-50 text-violet-600",
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", colors[color])}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-1">{label}</h3>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{subLabel}</p>
      </div>
    </div>
  );
}
