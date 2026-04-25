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
  Receipt
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
import { formatCurrency, cn } from '../lib/utils';
import { startOfMonth, subMonths, format, addMonths, isWithinInterval, addDays, set, isSameMonth, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  state: FinancialState;
  installments: Installment[];
  onAddPurchase: () => void;
}

export function Dashboard({ state, installments = [], onAddPurchase }: DashboardProps) {
  if (!state || !state.cards) {
    return <div className="p-8 text-center text-slate-500">Carregando dados do dashboard...</div>;
  }

  const [selectedCardForDetail, setSelectedCardForDetail] = useState<Card | null>(null);
  const currentMonth = new Date();
  const today = startOfDay(new Date());
  const next6Days = endOfDay(addDays(today, 6));

  // Função Sênior: Define o Ciclo de Faturamento Real do Cartão (Blindada contra variações de dias no mês)
  const getCardCycle = useCallback((card: Card) => {
    if (!card || !card.closingDay) return null;
    
    const now = new Date();
    // Define o fechamento alvo como sendo o deste mês
    let targetClosing = set(now, { 
      date: card.closingDay, 
      hours: 23, 
      minutes: 59, 
      seconds: 59, 
      milliseconds: 999 
    });
    
    // Se hoje já passou do fechamento, a fatura que estamos acumulando é a do mês que vem
    if (now > targetClosing) {
      targetClosing = addMonths(targetClosing, 1);
    }

    const cycleEnd = targetClosing;
    // O início do ciclo é o dia seguinte ao fechamento anterior (Fechamento Atual - 1 Mês + 1 Dia)
    const prevClosing = subMonths(set(targetClosing, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 }), 1);
    const cycleStart = addDays(prevClosing, 1);

    return { start: cycleStart, end: cycleEnd };
  }, []);

  // Somente parcelas de compras que NÃO estão marcadas como pagas
  const pendingInstallments = useMemo(() => {
    if (!installments || !state.purchases) return [];
    return installments.filter(inst => {
      const purchase = state.purchases.find(p => p.id === inst.purchaseId);
      return purchase?.status !== 'paid';
    });
  }, [installments, state.purchases]);

  const totalDebt = useMemo(() => {
    return pendingInstallments.reduce((sum, inst) => sum + inst.value, 0);
  }, [pendingInstallments]);

  // Estatísticas Globais de Limite
  const globalLimitStats = useMemo(() => {
    const totalLimit = state.cards.reduce((sum, card) => sum + (card.limit || 0), 0);
    return {
      total: totalLimit,
      available: Math.max(0, totalLimit - totalDebt),
      usagePercent: totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0
    };
  }, [state.cards, totalDebt]);

  // Valor total das PRÓXIMAS faturas somadas (Global)
  const totalNextInvoicesValue = useMemo(() => {
    return state.cards.reduce((sum, card) => {
      const cycle = getCardCycle(card);
      if (!cycle) return sum;
      
      const cardInvoice = pendingInstallments
        .filter(inst => inst.cardId === card.id && isWithinInterval(new Date(inst.date), { start: cycle.start, end: cycle.end }))
        .reduce((s, i) => s + i.value, 0);
      return sum + cardInvoice;
    }, 0);
  }, [state.cards, pendingInstallments, getCardCycle]);

  // Alertas de Vencimento nos próximos 6 dias
  const dueSoonCards = useMemo(() => {
    return state.cards.map(card => {
      let dueDate = set(new Date(), { date: card.dueDay, hours: 0, minutes: 0, seconds: 0 });
      if (dueDate < today && card.dueDay < today.getDate()) {
        dueDate = addMonths(dueDate, 1);
      }

      const isDueSoon = isWithinInterval(dueDate, { start: today, end: next6Days });
      
      if (isDueSoon) {
        const cycle = getCardCycle(card);
        if (!cycle) return null;
        
        const value = pendingInstallments
          .filter(inst => inst.cardId === card.id && isWithinInterval(new Date(inst.date), { start: cycle.start, end: cycle.end }))
          .reduce((s, i) => s + i.value, 0);
        
        return value > 0 ? { ...card, dueDate, totalValue: value } : null;
      }
      return null;
    }).filter(Boolean) as (Card & { dueDate: Date, totalValue: number })[];
  }, [state.cards, pendingInstallments, today, next6Days, getCardCycle]);

  // Chart data: Evolução baseada em meses calendários reais
  const chartData = useMemo(() => {
    try {
      const data = [];
      const insts = pendingInstallments || [];
      for (let i = 0; i < 6; i++) {
          const targetMonthDate = addMonths(currentMonth, i);
          const total = insts
              .filter(inst => inst && isSameMonth(new Date(inst.date), targetMonthDate))
              .reduce((sum, inst) => sum + (inst.value || 0), 0);
              
          data.push({
              name: format(targetMonthDate, 'MMM', { locale: ptBR }),
              valor: total,
          });
      }
      return data;
    } catch (e) {
      console.error("Erro no chartData:", e);
      return [];
    }
  }, [pendingInstallments, currentMonth]);

  // Consolidado de uso por cartão
  const cardData = useMemo(() => {
    try {
      if (!state.cards) return [];
      const pins = pendingInstallments || [];
      
      return state.cards.map(card => {
          if (!card) return null;
          const cycle = getCardCycle(card);
          if (!cycle) return null;
          
          const nextInvoiceValue = pins
              .filter(inst => 
                inst && 
                inst.cardId === card.id && 
                isWithinInterval(new Date(inst.date), { start: cycle.start, end: cycle.end })
              )
              .reduce((sum, inst) => sum + (inst.value || 0), 0);

          const totalUsedOnCard = pins
              .filter(inst => inst && inst.cardId === card.id)
              .reduce((sum, inst) => sum + (inst.value || 0), 0);

          return {
              id: card.id,
              name: card.name,
              value: totalUsedOnCard,
              usage: (card.limit && card.limit > 0) ? (totalUsedOnCard / card.limit) * 100 : 0,
              color: card.color || '#64748b',
              fullLimit: card.limit || 0,
              currentInvoice: nextInvoiceValue,
              cycle,
              available: Math.max(0, (card.limit || 0) - totalUsedOnCard)
          };
      }).filter(Boolean) as any[];
    } catch (e) {
      console.error("Erro no cardData:", e);
      return [];
    }
  }, [state.cards, pendingInstallments, getCardCycle]);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Olá, Investidor</h2>
          <p className="text-slate-500">Seu resumo financeiro está atualizado.</p>
        </div>
        <div className="flex items-center gap-3">
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
          value={formatCurrency(totalNextInvoicesValue)} 
          subLabel="Ciclo em aberto"
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
                const highlights = pendingInstallments.filter(inst => {
                  const card = state.cards.find(c => c.id === inst.cardId);
                  if (!card) return false;
                  const cycle = getCardCycle(card);
                  if (!cycle) return false;
                  return isWithinInterval(new Date(inst.date), { start: cycle.start, end: cycle.end });
                }).slice(0, 5);

                if (highlights.length === 0) return <p className="text-slate-400 text-sm text-center py-8">Nenhum lançamento no ciclo atual.</p>;

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
                        {dueSoonCards.map(card => (
                          <div key={card.id} className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-rose-200/50">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-8 rounded-full" style={{ backgroundColor: card.color }}></div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{card.name}</p>
                                <p className="text-[10px] text-rose-600 font-medium">Vence dia {format(card.dueDate, 'dd/MM')}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-rose-600">{formatCurrency(card.totalValue)}</p>
                            </div>
                          </div>
                        ))}
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
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400">DISPONÍVEL</span>
                  <span className="text-emerald-600">{formatCurrency(card.available)}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(card.usage, 100)}%` }} className="h-full rounded-full" style={{ backgroundColor: card.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                  const cardInfo = cardData.find(c => c.id === selectedCardForDetail.id);
                  if (!cardInfo || !cardInfo.cycle) return <p className="text-center text-slate-400">Ciclo não encontrado.</p>;

                  const filtered = pendingInstallments.filter(inst => 
                    inst.cardId === selectedCardForDetail.id && 
                    isWithinInterval(new Date(inst.date), { start: cardInfo.cycle.start, end: cardInfo.cycle.end })
                  );

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Início do Ciclo</p>
                          <p className="text-sm font-bold text-slate-700">{format(cardInfo.cycle.start, 'dd/MM/yyyy')}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Fechamento</p>
                          <p className="text-sm font-bold text-slate-700">{format(cardInfo.cycle.end, 'dd/MM/yyyy')}</p>
                        </div>
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
                                <div className="text-right">
                                  <p className="font-black text-slate-800 text-sm">{formatCurrency(inst.value)}</p>
                                  <p className="text-[10px] text-slate-400">{format(new Date(inst.date), 'dd/MM/yyyy')}</p>
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
