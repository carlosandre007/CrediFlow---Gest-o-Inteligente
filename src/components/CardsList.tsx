import React, { useState } from 'react';
import { CreditCard, Plus, Trash2, Banknote, ShieldCheck } from 'lucide-react';
import { Card } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface CardsListProps {
  cards: Card[];
  onAddCard: (card: Omit<Card, 'id'>) => void;
  onDeleteCard: (id: string) => void;
  onAddPurchase: (cardId: string) => void;
}

const COLORS = [
  { name: 'Roxo Deep', hex: '#6366f1' },
  { name: 'Azul Nubank', hex: '#8b5cf6' },
  { name: 'Laranja Inter', hex: '#f97316' },
  { name: 'Grafite', hex: '#1e293b' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Rosa Choque', hex: '#db2777' },
];

const BRANDS = ['Visa', 'Mastercard', 'Elo', 'Amex'];

export function CardsList({ cards, onAddCard, onDeleteCard, onAddPurchase }: CardsListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState<Omit<Card, 'id'>>({
    name: '',
    limit: 0,
    closingDay: 5,
    dueDay: 15,
    bank: '',
    brand: 'Visa',
    color: COLORS[0].hex,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCard(newCard);
    setShowAddForm(false);
    setNewCard({
      name: '',
      limit: 0,
      closingDay: 5,
      dueDay: 15,
      bank: '',
      brand: 'Visa',
      color: COLORS[0].hex,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Meus Cartões</h2>
          <p className="text-slate-500">Gerencie seus limites e datas de fechamento.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold shadow-lg shadow-violet-200 transition-all active:scale-95"
        >
          {showAddForm ? 'Cancelar' : <><Plus size={18}/> Novo Cartão</>}
        </button>
      </div>

      {showAddForm && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-white p-6 rounded-2xl border border-violet-100 shadow-xl overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Apelido do Cartão</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Nubank Pessoal"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                value={newCard.name}
                onChange={e => setNewCard({...newCard, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Limite Total (R$)</label>
              <input 
                type="number" 
                required
                placeholder="0,00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                value={newCard.limit || ''}
                onChange={e => setNewCard({...newCard, limit: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fechamento (Dia)</label>
              <input 
                type="number" 
                required
                min={1} max={31}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                value={newCard.closingDay}
                onChange={e => setNewCard({...newCard, closingDay: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento (Dia)</label>
              <input 
                type="number" 
                required
                min={1} max={31}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                value={newCard.dueDay}
                onChange={e => setNewCard({...newCard, dueDay: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Banco Emissor</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Nubank, Inter, BB"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                value={newCard.bank}
                onChange={e => setNewCard({...newCard, bank: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bandeira</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 transition-all font-medium"
                value={newCard.brand}
                onChange={e => setNewCard({...newCard, brand: e.target.value})}
              >
                {BRANDS.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cor do Cartão</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setNewCard({...newCard, color: c.hex})}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      newCard.color === c.hex ? "border-slate-800 scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
            <div className="md:col-span-2 lg:col-span-1 border-t md:border-t-0 flex items-end">
              <button 
                type="submit"
                className="w-full bg-violet-600 text-white rounded-xl py-3 font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all active:scale-95"
              >
                Salvar Cartão
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cards.length === 0 ? (
           <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                <CreditCard size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-600">Nenhum cartão ativo</h3>
              <p className="text-slate-400 max-w-xs mx-auto mt-2">Adicione seu primeiro cartão para começar a controlar seus gastos.</p>
           </div>
        ) : (
          cards.map((card) => (
            <motion.div 
               layout
               key={card.id} 
               className="group relative"
            >
               {/* Virtual Card UI */}
               <motion.div 
                 whileHover={{ scale: 1.02, rotateY: 2 }}
                 className="h-56 rounded-[24px] p-8 text-white flex flex-col justify-between shadow-xl hover:shadow-2xl hover:shadow-violet-200/50 transition-all duration-300 relative overflow-hidden cursor-pointer"
                 style={{ backgroundColor: card.color, perspective: '1000px' }}
               >
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
                  
                  <div className="flex items-start justify-between">
                     <div className="space-y-0.5">
                       <p className="text-xs font-medium opacity-70 uppercase tracking-widest">{card.bank || 'Banco Emissor'}</p>
                       <h4 className="text-xl font-bold tracking-tight">{card.name}</h4>
                     </div>
                     <div className="w-12 h-8 rounded-md bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Banknote size={18} className="opacity-80" />
                     </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] opacity-70 uppercase font-medium tracking-widest">Limite Disponível</p>
                    <p className="text-2xl font-bold font-mono tracking-tighter">{formatCurrency(card.limit)}</p>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="flex gap-8">
                       <div className="space-y-1">
                         <p className="text-[10px] opacity-70 uppercase font-medium">Fecha</p>
                         <p className="text-sm font-bold">Dia {card.closingDay}</p>
                       </div>
                       <div className="space-y-1">
                         <p className="text-[10px] opacity-70 uppercase font-medium">Vence</p>
                         <p className="text-sm font-bold">Dia {card.dueDay}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                       <ShieldCheck size={14} className="text-emerald-400" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">{card.brand}</span>
                    </div>
                  </div>

                  {/* Add Purchase Shortcut */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPurchase(card.id);
                    }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100 hover:scale-110"
                    title="Novo lançamento neste cartão"
                  >
                    <Plus size={24} className="text-white" />
                  </button>
               </motion.div>

               {/* Delete Action Overlay (Hidden by default, shown on hover/touch) */}
               <button 
                 onClick={() => onDeleteCard(card.id)}
                 className="absolute -top-3 -right-3 w-10 h-10 bg-white text-rose-500 rounded-full shadow-lg border border-rose-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 z-10"
               >
                 <Trash2 size={18} />
               </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
