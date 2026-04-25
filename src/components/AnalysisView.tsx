import React, { useState } from 'react';
import { FinancialState, Installment } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Zap, 
  AlertTriangle, 
  Calculator,
  Flame,
  Lightbulb,
  CheckCircle2,
  Info,
  CreditCard,
  ArrowRight,
  Target
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useFinancialStrategy } from '../hooks/useFinancialStrategy';

interface AnalysisViewProps {
  state: FinancialState;
  installments: Installment[];
}

export function AnalysisView({ state, installments }: AnalysisViewProps) {
  const [daysToQuit, setDaysToQuit] = useState(60);
  const [showSimulator, setShowSimulator] = useState(false);

  const strategy = useFinancialStrategy(state, installments, daysToQuit);

  const {
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
  } = strategy;

  const scoreStatus = 
    quitScore >= 80 ? { text: 'Excelente', color: 'text-emerald-400', bg: 'bg-emerald-400' } :
    quitScore >= 60 ? { text: 'Bom', color: 'text-blue-400', bg: 'bg-blue-400' } :
    quitScore >= 40 ? { text: 'Atenção', color: 'text-amber-400', bg: 'bg-amber-400' } :
    { text: 'Crítico', color: 'text-rose-400', bg: 'bg-rose-400' };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Estratégia de Quitação</h2>
          <p className="text-slate-500">Inteligência financeira para você sair do vermelho, baseada em dados reais.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Simulator Card */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg transform rotate-3">
                  <Calculator size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Calculadora de Quitação Plena</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-sm font-bold text-slate-500 uppercase">Meta em Dias</label>
                        <span className="text-2xl font-black text-violet-600">{daysToQuit} dias</span>
                      </div>
                      <input 
                        type="range" 
                        min="30" max="365" step="30"
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-violet-600"
                        value={daysToQuit}
                        onChange={e => setDaysToQuit(Number(e.target.value))}
                      />
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                        <span>30 dias</span>
                        <span>1 ano</span>
                      </div>
                   </div>

                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Aporte Diário Necessário</p>
                        <p className="text-4xl font-black text-slate-800">{formatCurrency(extraIncomeStrategy.daily)}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Pagando o total:</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(totalDebt)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Pagando mínimo (estimado):</span>
                          <span className="font-bold text-rose-600">{formatCurrency(extraIncomeStrategy.totalWithInterest)}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} className="text-amber-500" /> Juros poupados: {formatCurrency(extraIncomeStrategy.interestDiff)}
                        </p>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2">
                     <Lightbulb size={18} className="text-amber-500" /> Insights de IA (Tempo Real)
                   </h4>
                   <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                      {insights.length === 0 ? (
                        <InsightItem 
                          icon={CheckCircle2} 
                          title="Tudo em Ordem" 
                          text="Nenhum alerta crítico para os próximos dias." 
                          color="emerald" 
                        />
                      ) : (
                        insights.map(insight => {
                          const icon = insight.type === 'danger' ? AlertTriangle : insight.type === 'warning' ? Zap : insight.type === 'success' ? CheckCircle2 : Info;
                          const color = insight.type === 'danger' ? 'rose' : insight.type === 'warning' ? 'amber' : insight.type === 'success' ? 'emerald' : 'violet';
                          
                          return (
                            <InsightItem 
                              key={insight.id}
                              icon={icon} 
                              title={insight.title} 
                              text={insight.message} 
                              color={color} 
                            />
                          );
                        })
                      )}
                   </div>
                </div>
              </div>
           </div>
           {/* Background Decoration */}
           <div className="absolute right-0 top-0 w-64 h-64 bg-violet-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl -z-0"></div>
        </div>

        {/* Categories Analysis & Score */}
        <div className="bg-slate-900 p-8 rounded-[32px] text-white flex flex-col justify-between shadow-xl">
           <div>
             <h3 className="text-xl font-bold mb-2">Saúde da Dívida</h3>
             <p className="text-sm text-slate-400 mb-8">Baseado no seu fluxo real de R$ {totalDebt.toFixed(2)} em aberto.</p>
             
             <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-300">Necessário</span>
                    <span className="font-bold">{totalDebt > 0 ? Math.round((debtHealth.necessary / totalDebt) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${totalDebt > 0 ? (debtHealth.necessary / totalDebt) * 100 : 0}%` }}
                       className="h-full rounded-full transition-all duration-1000 bg-emerald-500"
                     />
                  </div>
                  <p className="text-right text-xs text-slate-500 font-bold">{formatCurrency(debtHealth.necessary)}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-300">Supérfluo / Parcelado Longo</span>
                    <span className="font-bold">{totalDebt > 0 ? Math.round((debtHealth.superfluous / totalDebt) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${totalDebt > 0 ? (debtHealth.superfluous / totalDebt) * 100 : 0}%` }}
                       className="h-full rounded-full transition-all duration-1000 bg-rose-500"
                     />
                  </div>
                  <p className="text-right text-xs text-slate-500 font-bold">{formatCurrency(debtHealth.superfluous)}</p>
                </div>
             </div>
           </div>

           <div className="mt-12 bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 relative z-10">
                 <p className="text-xs font-bold text-slate-400 uppercase">Score de Quitação</p>
                 <span className={`font-bold ${scoreStatus.color}`}>{scoreStatus.text}</span>
              </div>
              <div className="flex items-end justify-between relative z-10">
                <span className={`text-5xl font-black tracking-tighter ${scoreStatus.color}`}>
                  {quitScore}
                </span>
                <span className="text-slate-500 text-sm font-medium mb-1">/ 100</span>
              </div>
              <div className="mt-4 flex items-center gap-1 relative z-10">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < Math.ceil(quitScore / 20) ? scoreStatus.bg : "bg-slate-700")}></div>
                 ))}
              </div>
              
              <Target size={120} className="absolute -right-6 -bottom-6 text-white opacity-5" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Payment Priority */}
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-800">Ordem de Pagamento</h3>
          </div>
          
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {paymentPriority.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 size={48} className="mx-auto mb-4 opacity-20" />
                <p>Todas as faturas estão pagas!</p>
              </div>
            ) : (
              paymentPriority.map((item, index) => (
                <div key={item.card.id} className="p-4 rounded-2xl border border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{item.card.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Juros: {(item.interestRate * 100).toFixed(1)}% a.m</span>
                        {item.isOverdue && <span className="text-rose-500 font-bold px-1.5 py-0.5 bg-rose-100 rounded text-[10px] uppercase">Atrasado</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-slate-800">{formatCurrency(item.debt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {paymentPriority.length > 0 && (
            <button 
              onClick={() => setShowSimulator(!showSimulator)}
              className="mt-6 w-full py-3 rounded-xl bg-violet-50 text-violet-600 font-bold text-sm hover:bg-violet-100 transition-colors flex items-center justify-center gap-2"
            >
              Simular Pagamento <ArrowRight size={16} />
            </button>
          )}

          {showSimulator && paymentPriority.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-violet-600 text-white">
              <p className="text-sm">Para otimizar seu limite, se tiver apenas {formatCurrency(minimumPayments)}, foque totalmente em quitar o(s) cartão(ões) <strong>{paymentPriority.filter(p => p.isOverdue).map(p => p.card.name).join(', ') || paymentPriority[0].card.name}</strong> para estancar os juros de {(paymentPriority[0].interestRate * 100).toFixed(1)}%!</p>
            </div>
          )}
        </div>

        {/* Projection Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Projeção Futura (Real)</h3>
                <p className="text-sm text-slate-500">Gastos futuros deduzidos dos saldos de crédito atuais.</p>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                 <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                    <div className="w-3 h-3 rounded-full bg-violet-600"></div>
                    <span>Saldo a Pagar</span>
                 </div>
              </div>
           </div>
           
           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      tickFormatter={(v) => `R$ ${v}`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [formatCurrency(value), 'Dívida']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="valor" 
                      stroke="#8b5cf6" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}

function InsightItem({ icon: Icon, title, text, color }: { icon: any, title: string, text: string, color: string }) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="flex gap-4 items-start">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", colors[color])}>
        <Icon size={20} />
      </div>
      <div>
        <h5 className="font-bold text-slate-800 text-sm">{title}</h5>
        <p className="text-slate-500 text-xs leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
