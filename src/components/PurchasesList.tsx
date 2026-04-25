import React, { useMemo } from 'react';
import { ShoppingBag, Trash2, Calendar, CreditCard, Tag } from 'lucide-react';
import { Purchase, Card, Category } from '../types';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface PurchasesListProps {
  purchases: Purchase[];
  cards: Card[];
  categories: Category[];
  onDeletePurchase: (id: string) => void;
}

export function PurchasesList({ purchases, cards, categories, onDeletePurchase }: PurchasesListProps) {
  const sortedPurchases = useMemo(() => {
    return [...purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases]);

  const getCardName = (cardId: string) => {
    return cards.find(c => c.id === cardId)?.name || 'Cartão desconhecido';
  };

  const getCardColor = (cardId: string) => {
    return cards.find(c => c.id === cardId)?.color || '#94a3b8';
  };

  const getCategory = (categoryId: string) => {
    return categories.find(c => c.id === categoryId) || { name: 'Sem Categoria', color: '#64748b' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Lançamentos</h2>
          <p className="text-slate-500">Histórico completo de compras e parcelamentos.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Cartão</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Parcelas</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Valor Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                sortedPurchases.map((purchase) => (
                  <motion.tr 
                    layout
                    key={purchase.id} 
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Calendar size={14} />
                        {formatDate(purchase.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white"
                          style={{ backgroundColor: getCategory(purchase.categoryId).color }}
                        >
                          <ShoppingBag size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{purchase.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            {getCategory(purchase.categoryId).name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCardColor(purchase.cardId) }} />
                        <span className="text-xs font-bold text-slate-600">{getCardName(purchase.cardId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500">
                        {purchase.installments}x
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-black text-slate-800">{formatCurrency(purchase.totalValue)}</p>
                      {purchase.installments > 1 && (
                        <p className="text-[10px] text-slate-400 font-medium">
                          {formatCurrency(purchase.totalValue / purchase.installments)} /mês
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => onDeletePurchase(purchase.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
