import React, { useMemo, useState } from 'react';
import { Card, Installment, InvoiceStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Edit2, Trash2, Plus } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceViewProps {
  onTogglePaid: (cardId: string, month: number, year: number) => void;
  onEditPurchase: (purchase: any) => void;
  onDeletePurchase: (id: string) => Promise<void>;
  purchases: any[];
}

export function InvoiceView({ cards, installments, paidInvoices, onTogglePaid, onEditPurchase, onDeletePurchase, purchases }: InvoiceViewProps) {
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const targetDate = useMemo(() => addMonths(new Date(), selectedMonthOffset), [selectedMonthOffset]);
  const month = targetDate.getMonth();
  const year = targetDate.getFullYear();

  const monthlyInvoices = useMemo(() => {
    return cards.map(card => {
      const cardInstallments = installments.filter(
        inst => inst.cardId === card.id && inst.month === month && inst.year === year
      );
      const total = cardInstallments.reduce((sum, i) => sum + i.value, 0);
      
      const key = `${card.id}-${month}-${year}`;
      const isPaid = paidInvoices.includes(key);
      
      let status = InvoiceStatus.OPEN;
      if (isPaid) status = InvoiceStatus.PAID;
      else if (selectedMonthOffset < 0) status = InvoiceStatus.CLOSED;

      return {
        card,
        installments: cardInstallments,
        total,
        status,
        isPaid
      };
    });
  }, [cards, installments, month, year, selectedMonthOffset, paidInvoices]);

  const totalMonth = useMemo(() => monthlyInvoices.reduce((sum, inv) => sum + inv.total, 0), [monthlyInvoices]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
           <button onClick={() => setSelectedMonthOffset(prev => prev - 1)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
             <ChevronLeft size={24} />
           </button>
           <div className="text-center min-w-[120px]">
              <h3 className="text-lg font-bold text-slate-800 capitalize">
                {format(targetDate, 'MMMM', { locale: ptBR })}
              </h3>
              <p className="text-xs font-medium text-slate-400">{year}</p>
           </div>
           <button onClick={() => setSelectedMonthOffset(prev => prev + 1)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
             <ChevronRight size={24} />
           </button>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total do Mês</p>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(totalMonth)}</p>
           </div>
           <button 
            onClick={() => onEditPurchase(null)}
            className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-violet-100 transition-all flex items-center gap-2 active:scale-95"
           >
             <Plus size={16} /> Novo Lançamento
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
         {monthlyInvoices.map(({ card, installments: cardInsts, total, status, isPaid }) => (
           <motion.div key={card.id} layout className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
             <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: card.color }}>
                      <CheckCircle2 size={20} />
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-800">{card.name}</h4>
                      <div className="flex items-center gap-2">
                         <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase cursor-pointer hover:opacity-80 transition-opacity", 
                            status === InvoiceStatus.PAID ? "bg-emerald-50 text-emerald-600" :
                            status === InvoiceStatus.CLOSED ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                         )}
                         onClick={() => onTogglePaid(card.id, month, year)}
                         >
                            {status}
                         </span>
                         <span className="text-[10px] text-slate-400 uppercase font-bold">Vence dia {card.dueDay}</span>
                      </div>
                   </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                   <p className="text-lg font-bold text-slate-800">{formatCurrency(total)}</p>
                   <button 
                    onClick={() => onTogglePaid(card.id, month, year)}
                    className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-lg transition-all",
                      isPaid ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                   >
                    {isPaid ? 'Estornar Pagamento' : 'Marcar como Paga'}
                   </button>
                </div>
             </div>
             <div className="flex-1 overflow-auto max-h-[300px] divide-y divide-slate-100">
                {cardInsts.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400">Sem lançamentos.</div>
                ) : (
                  cardInsts.map((inst, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400"><Clock size={14} /></div>
                          <div>
                             <p className="text-sm font-bold text-slate-700">{inst.purchaseName}</p>
                             <p className="text-[10px] text-slate-400">Parcela {inst.installmentNumber} de {inst.totalInstallments}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                         <p className="text-sm font-bold text-slate-600">{formatCurrency(inst.value)}</p>
                         <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                const p = purchases.find(p => p.id === inst.purchaseId);
                                if (p) onEditPurchase(p);
                              }}
                              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm('Excluir este lançamento completo?')) {
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
                  ))
                )}
             </div>
           </motion.div>
         ))}
      </div>
    </div>
  );
}
