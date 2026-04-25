import React, { useMemo } from 'react';
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { FinancialState, Installment, Card } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { startOfMonth, subMonths, format, addMonths, isWithinInterval, addDays, set } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';

interface DashboardProps {
  state: FinancialState;
  installments: Installment[];
  onAddPurchase: () => void;
}

export function Dashboard({ state, installments, onAddPurchase }: DashboardProps) {
  const currentMonth = new Date();
  const today = new Date();
  const next6Days = addDays(today, 6);

  const totalDebt = useMemo(() => {
    return installments.reduce((sum, inst) => sum + inst.value, 0);
  }, [installments]);

  const currentMonthValue = useMemo(() => {
    return installments
      .filter(inst => inst.month === currentMonth.getMonth() && inst.year === currentMonth.getFullYear())
      .reduce((sum, inst) => sum + inst.value, 0);
  }, [installments]);

  const nextMonthValue = useMemo(() => {
    const next = addMonths(currentMonth, 1);
    return installments
      .filter(inst => inst.month === next.getMonth() && inst.year === next.getFullYear())
      .reduce((sum, inst) => sum + inst.value, 0);
  }, [installments, currentMonth]);

  // Global Limit Calculation
  const globalLimitStats = useMemo(() => {
    const totalLimit = state.cards.reduce((sum, card) => sum + card.limit, 0);
    const totalUsedCurrent = installments
      .filter(inst => inst.month === currentMonth.getMonth() && inst.year === currentMonth.getFullYear())
      .reduce((sum, inst) => sum + inst.value, 0);
    
    return {
      total: totalLimit,
      available: totalLimit - totalUsedCurrent,
      usagePercent: totalLimit > 0 ? (totalUsedCurrent / totalLimit) * 100 : 0
    };
  }, [state.cards, installments, currentMonth]);

  // Due Soon Invoices (next 6 days)
  const dueSoonCards = useMemo(() => {
    return state.cards.map(card => {
      let dueDate = set(new Date(), { date: card.dueDay, hours: 0, minutes: 0, seconds: 0 });
      
      // If due day has passed this month, check next month
      if (dueDate < today && card.dueDay < today.getDate()) {
        dueDate = addMonths(dueDate, 1);
      }

      const isDueSoon = isWithinInterval(dueDate, { start: today, end: next6Days });
      
      if (isDueSoon) {
        const value = installments
          .filter(inst => inst.cardId === card.id && inst.month === dueDate.getMonth() && inst.year === dueDate.getFullYear())
          .reduce((sum, inst) => sum + inst.value, 0);
        
        return { ...card, dueDate, totalValue: value };
      }
      return null;
    }).filter(c => c !== null && c.totalValue > 0) as (Card & { dueDate: Date, totalValue: number })[];
  }, [state.cards, installments, today, next6Days]);

  // Chart data: Monthly debt evolution
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 0; i < 6; i++) {
        const d = addMonths(currentMonth, i);
        const m = d.getMonth();
        const y = d.getFullYear();
        const total = installments
            .filter(inst => inst.month === m && inst.year === y)
            .reduce((sum, inst) => sum + inst.value, 0);
            
        data.push({
            name: format(d, 'MMM', { locale: ptBR }),
            valor: total,
        });
    }
    return data;
  }, [installments, currentMonth]);

  // Card usage data
  const cardData = useMemo(() => {
    return state.cards.map(card => {
        const used = installments
            .filter(inst => inst.cardId === card.id)
            .reduce((sum, inst) => sum + inst.value, 0);
        
        const currentInvoice = installments
            .filter(inst => inst.cardId === card.id && inst.month === currentMonth.getMonth() && inst.year === currentMonth.getFullYear())
            .reduce((sum, inst) => sum + inst.value, 0);

        return {
            name: card.name,
            value: used,
            usage: (currentInvoice / card.limit) * 100,
            color: card.color,
            fullLimit: card.limit,
            currentInvoice
        };
    });
  }, [state.cards, installments, currentMonth]);

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
          value={formatCurrency(currentMonthValue)} 
          subLabel="Vencendo este mês"
          icon={Calendar}
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

      {/* Main Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Debt Evolution Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-bold text-slate-800">Evolução da Dívida</h3>
                <p className="text-sm text-slate-500">Próximos 6 meses</p>
              </div>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-violet-500">
                <option>Últimos 6 meses</option>
                <option>Anual</option>
              </select>
           </div>
           
           <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}} 
                      dy={10}
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#94a3b8', fontSize: 12}}
                       tickFormatter={(value) => `R$ ${value}`}
                    />
                    <Tooltip 
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                       formatter={(value: number) => [formatCurrency(value), 'Valor']}
                    />
                    <Bar 
                      dataKey="valor" 
                      fill="#8b5cf6" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Card Limits */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
           <h3 className="font-bold text-slate-800 mb-6">Uso de Limite</h3>
           <div className="space-y-6 flex-1">
              {cardData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <CreditCard className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500">Nenhum cartão cadastrado.</p>
                </div>
              ) : (
                cardData.map((card, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }}></div>
                         <span className="font-medium text-slate-700">{card.name}</span>
                      </div>
                      <span className="text-slate-500">{Math.round(card.usage)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${Math.min(card.usage, 100)}%` }}
                         className={cn(
                           "h-full rounded-full transition-all duration-1000",
                           card.usage > 90 ? "bg-rose-500" : card.usage > 70 ? "bg-amber-500" : "bg-violet-500"
                         )}
                         style={{ backgroundColor: card.usage <= 70 ? card.color : undefined }}
                       />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>{formatCurrency(card.currentInvoice)} usado</span>
                      <span>Total: {formatCurrency(card.fullLimit)}</span>
                    </div>
                  </div>
                ))
              )}
           </div>
           
           <div className="mt-8 bg-violet-50 p-4 rounded-xl border border-violet-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-violet-600 shadow-sm shrink-0">
                  <Target size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-violet-900 mb-1">Dica Estratégica</h4>
                  <p className="text-[10px] text-violet-700 leading-relaxed">
                    Você está comprometendo 42% da sua renda. Evite novos parcelamentos este mês para manter seu Score alto.
                  </p>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Recent Purchases & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Destaques da Fatura</h3>
              <button className="text-sm text-violet-600 font-medium hover:underline">Ver tudo</button>
           </div>
           <div className="space-y-4">
              {installments.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Nenhuma compra parcelada.</p>
              ) : (
                installments
                  .filter(inst => inst.month === currentMonth.getMonth() && inst.year === currentMonth.getFullYear())
                  .slice(0, 5)
                  .map((inst, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 flex rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <Receipt size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{inst.purchaseName}</p>
                          <p className="text-xs text-slate-400">Parcela {inst.installmentNumber} de {inst.totalInstallments}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800 text-sm">{formatCurrency(inst.value)}</p>
                        <p className="text-[10px] text-slate-400">{format(new Date(inst.date), 'dd/MM')}</p>
                      </div>
                    </div>
                  ))
              )}
           </div>
         </div>

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
                    <span className="text-sm font-medium text-violet-100">Meta de Quitação</span>
                 </div>
                 <h3 className="text-2xl font-bold mb-1">{formatCurrency(totalDebt / 60)} <span className="text-xs font-normal opacity-70">p/ dia</span></h3>
                 <p className="text-sm text-violet-200 mb-6">Para zerar suas dívidas em 60 dias.</p>
                 <button className="bg-white text-violet-700 px-6 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-violet-50 transition-colors">
                    Simular Cenários
                 </button>
               </div>
               {/* Aesthetic circles */}
               <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white opacity-10"></div>
               <div className="absolute right-8 top-8 w-16 h-16 rounded-full bg-white opacity-5"></div>
            </div>
         </div>
      </div>
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
