import React, { useMemo, useState } from 'react';
import { Card, Installment } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Zap, 
  Target, 
  TrendingDown, 
  AlertTriangle, 
  ArrowRight, 
  Calculator,
  Flame,
  Lightbulb,
  DollarSign,
  TrendingUp
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
import { addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalysisViewProps {
  cards: Card[];
  installments: Installment[];
}

export function AnalysisView({ cards, installments }: AnalysisViewProps) {
  const [daysToQuit, setDaysToQuit] = useState(60);
  
  const totalDebt = useMemo(() => installments.reduce((sum, i) => sum + i.value, 0), [installments]);
  
  const dailyPaymentNeeded = useMemo(() => (totalDebt / daysToQuit), [totalDebt, daysToQuit]);

  const categoriesData = useMemo(() => {
    // In a real app we'd have real categories, here we simulate based on purchase metadata if we had it
    // For now let's just use Necessário vs Supérfluo
    const necessary = installments.reduce((sum, i) => sum + (i.value * 0.7), 0); // Simulated split
    const superfluous = totalDebt - necessary;
    
    return [
      { name: 'Necessário', value: necessary, color: '#10b981' },
      { name: 'Supérfluo', value: superfluous, color: '#f43f5e' },
    ];
  }, [totalDebt, installments]);

  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = addMonths(now, i);
      const total = installments
        .filter(inst => inst.month === d.getMonth() && inst.year === d.getFullYear())
        .reduce((sum, n) => sum + n.value, 0);
      data.push({
        name: format(d, 'MMM', { locale: ptBR }),
        valor: total
      });
    }
    return data;
  }, [installments]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Estratégia de Quitação</h2>
          <p className="text-slate-500">Inteligência financeira para você sair do vermelho.</p>
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
                <h3 className="text-xl font-bold text-slate-800">Calculadora de Renda Extra</h3>
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

                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase">Renda Extra Diária Necessária</p>
                      <p className="text-4xl font-black text-slate-800">{formatCurrency(dailyPaymentNeeded)}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Flame size={12} className="text-orange-500" /> Foco total para quitação.
                      </p>
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="font-bold text-slate-800 flex items-center gap-2">
                     <Lightbulb size={18} className="text-amber-500" /> Insights de IA
                   </h4>
                   <div className="space-y-4">
                      <InsightItem 
                         icon={TrendingDown} 
                         title="Corte de Gastos" 
                         text="Reduza 20% do supérfluo para ganhar R$ 150/mês." 
                         color="emerald" 
                      />
                      <InsightItem 
                         icon={AlertTriangle} 
                         title="Risco de Juros" 
                         text="Evite pagar o mínimo do cartão Nubank este mês." 
                         color="rose" 
                      />
                      <InsightItem 
                         icon={Zap} 
                         title="Antecipação" 
                         text="Antecipar 2 parcelas do Inter rende 5% de desconto." 
                         color="violet" 
                      />
                   </div>
                </div>
              </div>
           </div>
           {/* Background Decoration */}
           <div className="absolute right-0 top-0 w-64 h-64 bg-violet-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl -z-0"></div>
        </div>

        {/* Categories Analysis */}
        <div className="bg-slate-900 p-8 rounded-[32px] text-white flex flex-col justify-between shadow-xl">
           <div>
             <h3 className="text-xl font-bold mb-2">Saúde da Dívida</h3>
             <p className="text-sm text-slate-400 mb-8">Classificação de gastos ativos.</p>
             
             <div className="space-y-8">
                {categoriesData.map((cat, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-300">{cat.name}</span>
                      <span className="font-bold">{Math.round((cat.value / totalDebt) * 100)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${(cat.value / totalDebt) * 100}%` }}
                         className="h-full rounded-full transition-all duration-1000"
                         style={{ backgroundColor: cat.color }}
                       />
                    </div>
                    <p className="text-right text-xs text-slate-500 font-bold">{formatCurrency(cat.value)}</p>
                  </div>
                ))}
             </div>
           </div>

           <div className="mt-12 bg-white/5 p-6 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-4">
                 <p className="text-xs font-bold text-slate-400 uppercase">Score de Quitação</p>
                 <span className="text-emerald-400 font-bold">Excelente</span>
              </div>
              <div className="flex items-center gap-1">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < 4 ? "bg-emerald-400" : "bg-slate-700")}></div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
         <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Projeção Futura</h3>
              <p className="text-sm text-slate-500">Estimativa de gastos nos próximos 12 meses.</p>
            </div>
            <div className="hidden sm:flex items-center gap-4">
               <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                  <div className="w-3 h-3 rounded-full bg-violet-600"></div>
                  <span>Estimado</span>
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
  );
}

function InsightItem({ icon: Icon, title, text, color }: { icon: any, title: string, text: string, color: string }) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="flex items-start gap-4 group cursor-help">
       <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", colors[color])}>
          <Icon size={20} />
       </div>
       <div>
          <h5 className="text-sm font-bold text-slate-800 mb-0.5">{title}</h5>
          <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
       </div>
    </div>
  );
}
