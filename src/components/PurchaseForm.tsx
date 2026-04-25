import React, { useState } from 'react';
import { Purchase, Category } from '../types';
import { cn, formatCurrencyMask, parseCurrency } from '../lib/utils';
import { X, ShoppingBag, Package, Calendar, CreditCard as CardIcon, Tag, Plus, Trash2, Edit2, Check } from 'lucide-react';

interface PurchaseFormProps {
  cards: { id: string, name: string }[];
  categories: Category[];
  initialCardId?: string;
  initialPurchase?: Purchase;
  onSubmit: (purchase: Omit<Purchase, 'id'>, id?: string) => void;
  onCancel: () => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (id: string, updates: Partial<Omit<Category, 'id'>>) => void;
  onDeleteCategory: (id: string) => void;
}

export function PurchaseForm({ 
  cards, 
  categories, 
  initialCardId,
  initialPurchase,
  onSubmit, 
  onCancel, 
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}: PurchaseFormProps) {
  const [formData, setFormData] = useState<Omit<Purchase, 'id'>>({
    name: initialPurchase?.name || '',
    totalValue: initialPurchase?.totalValue || 0,
    installments: initialPurchase?.installments || 1,
    cardId: initialPurchase?.cardId || initialCardId || cards[0]?.id || '',
    date: initialPurchase?.date || new Date().toISOString().split('T')[0],
    categoryId: initialPurchase?.categoryId || categories[0]?.id || '',
    status: initialPurchase?.status || 'pending'
  });

  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8b5cf6');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cardId) return alert('Selecione um cartão');
    if (!formData.categoryId) return alert('Selecione uma categoria');
    onSubmit(formData, initialPurchase?.id);
  };

  const handleAddOrUpdateCategory = () => {
    if (!newCatName.trim()) return;
    
    if (editingCategoryId) {
      onUpdateCategory(editingCategoryId, { name: newCatName, color: newCatColor });
    } else {
      onAddCategory({ name: newCatName, color: newCatColor });
    }
    
    setEditingCategoryId(null);
    setNewCatName('');
    setNewCatColor('#8b5cf6');
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setNewCatName(cat.name);
    setNewCatColor(cat.color);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isManagingCategories ? 'Gerenciar Categorias' : (initialPurchase ? 'Editar Compra' : 'Nova Compra')}
          </h2>
          <p className="text-sm text-slate-500">
            {isManagingCategories ? 'Adicione ou edite suas categorias.' : 'Registre gastos e controle parcelas.'}
          </p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
          <X size={24} />
        </button>
      </div>

      {!isManagingCategories ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShoppingBag size={14} /> Nome da Compra
            </label>
            <input 
              required
              type="text" 
              placeholder="Ex: iPhone 15 Pro"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-violet-500 transition-all font-medium"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                R$ Valor Total
              </label>
              <input 
                required
                type="text" 
                placeholder="0,00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-violet-500 transition-all font-bold"
                value={formatCurrencyMask((formData.totalValue * 100).toFixed(0))}
                onChange={e => setFormData({...formData, totalValue: parseCurrency(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Package size={14} /> Parcelas
              </label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-violet-500 transition-all font-medium"
                value={formData.installments}
                onChange={e => setFormData({...formData, installments: Number(e.target.value)})}
              >
                {[...Array(24)].map((_, i) => (
                  <option key={i} value={i + 1}>{i + 1}x {i > 0 ? `(R$ ${(formData.totalValue / (i + 1)).toFixed(2)})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <CardIcon size={14} /> Cartão
              </label>
              <select 
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-violet-500 transition-all font-medium"
                value={formData.cardId}
                onChange={e => setFormData({...formData, cardId: e.target.value})}
              >
                {cards.length === 0 ? (
                  <option disabled value="">Nenhum cartão</option>
                ) : (
                  cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} /> Data
              </label>
              <input 
                required
                type="date" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-violet-500 transition-all font-medium"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Tag size={14} /> Categoria
              </label>
              <button 
                type="button" 
                onClick={() => setIsManagingCategories(true)}
                className="text-xs font-bold text-violet-600 flex items-center gap-1 hover:underline"
              >
                <Plus size={12}/> Gerenciar
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({...formData, categoryId: cat.id})}
                  className={cn(
                    "px-3 py-2 rounded-xl border-2 text-[10px] font-bold transition-all flex items-center gap-2",
                    formData.categoryId === cat.id 
                      ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-200" 
                      : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                  )}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={onCancel}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={cards.length === 0}
              className="flex-2 bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-violet-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {initialPurchase ? 'Salvar Alterações' : 'Confirmar Compra'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-2 items-center">
            <input 
               type="text" 
               placeholder="Nome da categoria"
               className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
               value={newCatName}
               onChange={e => setNewCatName(e.target.value)}
            />
            <input 
              type="color" 
              className="w-10 h-10 rounded-full border-none p-0 overflow-hidden cursor-pointer bg-transparent"
              value={newCatColor}
              onChange={e => setNewCatColor(e.target.value)}
            />
            <button 
              type="button"
              onClick={handleAddOrUpdateCategory}
              className="bg-violet-600 text-white p-2 rounded-xl"
            >
              {editingCategoryId ? <Check size={20} /> : <Plus size={20} />}
            </button>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                  <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => startEditCategory(cat)}
                    className="p-1.5 text-slate-400 hover:text-blue-500"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => onDeleteCategory(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setIsManagingCategories(false)}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
          >
            Voltar para Lançamento
          </button>
        </div>
      )}
    </div>
  );
}
