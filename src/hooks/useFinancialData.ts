import { useState, useEffect, useCallback } from 'react';
import { Card, Purchase, FinancialState, Installment, Category, AppNotification } from '../types';
import { generateInstallments } from '../utils/finance';
import { supabase } from '../lib/supabase';

const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Alimentação', color: '#ef4444' },
  { id: '2', name: 'Transporte', color: '#3b82f6' },
  { id: '3', name: 'Lazer', color: '#f59e0b' },
  { id: '4', name: 'Saúde', color: '#10b981' },
  { id: '5', name: 'Shopping', color: '#8b5cf6' },
  { id: '6', name: 'Outros', color: '#64748b' },
];

export function useFinancialData() {
  const [state, setState] = useState<FinancialState>({
    cards: [],
    purchases: [],
    categories: DEFAULT_CATEGORIES,
    paidInvoices: [],
    notifications: []
  });
  const [loading, setLoading] = useState(true);

  // Fetch all data from Supabase on mount
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        { data: cardsData },
        { data: purchasesData },
        { data: categoriesData },
        { data: paidInvoicesData },
        { data: notificationsData }
      ] = await Promise.all([
        supabase.from('cards').select('*'),
        supabase.from('purchases').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('paid_invoices').select('*'),
        supabase.from('notifications').select('*').order('date', { ascending: false }).limit(10)
      ]);

      setState({
        cards: (cardsData || []).map(c => ({
          id: c.id,
          name: c.name,
          limit: c.limit,
          closingDay: c.closing_day,
          dueDay: c.due_day,
          bank: c.bank,
          brand: c.brand,
          color: c.color
        })),
        purchases: (purchasesData || []).map(p => ({
          id: p.id,
          name: p.name,
          totalValue: p.total_value,
          installments: p.installments,
          cardId: p.card_id,
          date: p.date,
          categoryId: p.category_id
        })),
        categories: (categoriesData && categoriesData.length > 0) ? categoriesData : DEFAULT_CATEGORIES,
        paidInvoices: (paidInvoicesData || []).map(pi => `${pi.card_id}-${pi.month}-${pi.year}`),
        notifications: (notificationsData || []).map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type as any,
          date: n.date,
          read: n.read
        }))
      });
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addNotification = useCallback(async (notif: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
    const { data, error } = await supabase.from('notifications').insert([{
      title: notif.title,
      message: notif.message,
      type: notif.type,
      read: false
    }]).select().single();

    if (data && !error) {
      setState(prev => ({
        ...prev,
        notifications: [
          {
            id: data.id,
            title: data.title,
            message: data.message,
            type: data.type as any,
            date: data.date,
            read: data.read
          },
          ...(prev.notifications || [])
        ].slice(0, 10)
      }));
    }
  }, []);

  const markNotificationsRead = useCallback(async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    if (!error) {
      setState(prev => ({
        ...prev,
        notifications: (prev.notifications || []).map(n => ({ ...n, read: true }))
      }));
    }
  }, []);

  const addCard = useCallback(async (card: Omit<Card, 'id'>) => {
    const { data, error } = await supabase.from('cards').insert([{
      name: card.name,
      limit: card.limit,
      closing_day: card.closingDay,
      due_day: card.dueDay,
      bank: card.bank,
      brand: card.brand,
      color: card.color
    }]).select().single();

    if (data && !error) {
      const newCard: Card = {
        id: data.id,
        name: data.name,
        limit: data.limit,
        closingDay: data.closing_day,
        dueDay: data.due_day,
        bank: data.bank,
        brand: data.brand,
        color: data.color
      };
      setState(prev => ({ ...prev, cards: [...prev.cards, newCard] }));
      addNotification({
        title: 'Novo Cartão',
        message: `Cartão ${card.name} foi adicionado com sucesso.`,
        type: 'card'
      });
    } else if (error) {
       console.error('Error adding card:', error);
    }
  }, [addNotification]);

  const addPurchase = useCallback(async (purchase: Omit<Purchase, 'id'>) => {
    const { data, error } = await supabase.from('purchases').insert([{
      name: purchase.name,
      total_value: purchase.totalValue,
      installments: purchase.installments,
      card_id: purchase.cardId,
      category_id: purchase.categoryId,
      date: purchase.date
    }]).select().single();

    if (data && !error) {
      const newPurchase: Purchase = {
        id: data.id,
        name: data.name,
        totalValue: data.total_value,
        installments: data.installments,
        cardId: data.card_id,
        date: data.date,
        categoryId: data.category_id
      };
      setState(prev => ({ ...prev, purchases: [...prev.purchases, newPurchase] }));
      addNotification({
        title: 'Nova Compra',
        message: `${purchase.name} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(purchase.totalValue)}`,
        type: 'purchase'
      });
    } else if (error) {
      console.error('Error adding purchase:', error);
    }
  }, [addNotification]);

  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    const { data, error } = await supabase.from('categories').insert([{
      name: category.name,
      color: category.color
    }]).select().single();

    if (data && !error) {
      setState(prev => ({ ...prev, categories: [...prev.categories, data] }));
    }
  }, []);

  const updateCategory = useCallback(async (id: string, updates: Partial<Omit<Category, 'id'>>) => {
    const { error } = await supabase.from('categories').update(updates).eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        categories: prev.categories.map(c => c.id === id ? { ...c, ...updates } : c)
      }));
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        cards: prev.cards.filter(c => c.id !== id),
        purchases: prev.purchases.filter(p => p.cardId !== id),
      }));
    }
  }, []);

  const deletePurchase = useCallback(async (id: string) => {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        purchases: prev.purchases.filter(p => p.id !== id),
      }));
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) {
      setState(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c.id !== id),
        purchases: prev.purchases.map(p => p.categoryId === id ? { ...p, categoryId: '6' } : p)
      }));
    }
  }, []);

  const toggleInvoicePaid = useCallback(async (cardId: string, month: number, year: number) => {
    const key = `${cardId}-${month}-${year}`;
    const isPaid = state.paidInvoices?.includes(key);

    if (isPaid) {
      const { error } = await supabase
        .from('paid_invoices')
        .delete()
        .eq('card_id', cardId)
        .eq('month', month)
        .eq('year', year);
      
      if (!error) {
        setState(prev => ({
          ...prev,
          paidInvoices: prev.paidInvoices.filter(k => k !== key)
        }));
      }
    } else {
      const { error } = await supabase.from('paid_invoices').insert([{
        card_id: cardId,
        month,
        year
      }]);

      if (!error) {
        setState(prev => ({
          ...prev,
          paidInvoices: [...(prev.paidInvoices || []), key]
        }));
      }
    }
  }, [state.paidInvoices]);

  const resetData = useCallback(async () => {
    // This is dangerous, maybe just clear everything for the user
    await Promise.all([
      supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('purchases').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ]);
    setState({ cards: [], purchases: [], categories: DEFAULT_CATEGORIES, paidInvoices: [], notifications: [] });
  }, []);

  const allInstallments = state.purchases.flatMap(purchase => {
    const card = state.cards.find(c => c.id === purchase.cardId);
    if (!card) return [];
    return generateInstallments(purchase, card);
  });

  return {
    state,
    loading,
    addCard,
    addPurchase,
    addCategory,
    updateCategory,
    deleteCard,
    deletePurchase,
    deleteCategory,
    toggleInvoicePaid,
    markNotificationsRead,
    resetData,
    allInstallments,
    refreshData: fetchData
  };
}
