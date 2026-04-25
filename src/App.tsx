/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Plus, 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Wallet,
  Settings,
  Bell,
  Search,
  PlusCircle,
  HelpCircle,
  PiggyBank,
  Zap,
  ShoppingBag
} from 'lucide-react';
import { useFinancialData } from './hooks/useFinancialData';
import { cn, formatCurrency } from './lib/utils';
import { Dashboard } from './components/Dashboard';
import { CardsList } from './components/CardsList';
import { PurchaseForm } from './components/PurchaseForm';
import { InvoiceView } from './components/InvoiceView';
import { AnalysisView } from './components/AnalysisView';
import { PurchasesList } from './components/PurchasesList';
import { NotificationDropdown } from './components/NotificationDropdown';

import { Login } from './components/Login';

type View = 'dashboard' | 'cards' | 'purchases' | 'invoices' | 'analysis';

export default function App() {
  const [user, setUser] = useState<{ name: string, identifier: string } | null>(null);
  const [activeView, setActiveView] = useState<View>('dashboard');

  const { 
    state, 
    loading,
    addCard, 
    addPurchase, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    deleteCard, 
    deletePurchase, 
    toggleInvoicePaid, 
    markNotificationsRead,
    allInstallments 
  } = useFinancialData();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [preSelectedCardId, setPreSelectedCardId] = useState<string | undefined>(undefined);

  const unreadNotifications = (state.notifications || []).filter(n => !n.read).length;

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="mb-4"
        >
          <Zap className="text-violet-600" size={48} fill="currentColor" />
        </motion.div>
        <p className="text-slate-500 font-medium animate-pulse">Carregando seus dados financeiros...</p>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'cards', label: 'Cartões', icon: CreditCard },
    { id: 'purchases', label: 'Lançamentos', icon: ShoppingBag },
    { id: 'invoices', label: 'Faturas', icon: Receipt },
    { id: 'analysis', label: 'Estratégia', icon: Zap },
  ];

  const handleOpenPurchaseModal = (cardId?: string) => {
    setPreSelectedCardId(cardId);
    setIsPurchaseModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-violet-600 font-bold text-2xl tracking-tight">
            <Zap className="fill-violet-600" size={28} />
            <span>CrediFlow</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                activeView === item.id 
                  ? "bg-violet-50 text-violet-600 font-medium shadow-sm shadow-violet-100" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={() => handleOpenPurchaseModal()}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-3 flex items-center justify-center gap-2 font-medium shadow-lg shadow-violet-200 transition-all active:scale-95"
          >
            <Plus size={20} />
            Nova Compra
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold tracking-tight text-slate-800 md:hidden">CrediFlow</h1>
             <div className="hidden md:flex items-center gap-2 text-slate-400 text-sm">
                <span>Meu Perfil</span>
                <ChevronRight size={14} />
                <span className="text-slate-900 font-medium">{activeView.charAt(0).toUpperCase() + activeView.slice(1)}</span>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative hidden sm:block">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                 type="text" 
                 placeholder="Buscar transações..." 
                 className="bg-slate-100 border-none rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-violet-500 w-64"
               />
             </div>
             <div className="relative">
               <button 
                 onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                 className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 relative group"
               >
                 <Bell size={20} className="group-hover:rotate-12 transition-transform" />
                 {unreadNotifications > 0 && (
                   <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                     {unreadNotifications}
                   </span>
                 )}
               </button>
               
               <NotificationDropdown 
                 notifications={state.notifications || []} 
                 isOpen={isNotificationsOpen}
                 onClose={() => setIsNotificationsOpen(false)}
                 onMarkRead={() => {
                   markNotificationsRead();
                 }}
               />
             </div>
             <button className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold border border-violet-200">
                L
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-8 flex-1 overflow-auto max-w-[1600px] mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeView === 'dashboard' && (
                <Dashboard 
                  state={state} 
                  installments={allInstallments} 
                  onAddPurchase={() => handleOpenPurchaseModal()}
                />
              )}
              {activeView === 'cards' && (
                <CardsList 
                  cards={state.cards} 
                  onAddCard={addCard} 
                  onDeleteCard={deleteCard}
                  onAddPurchase={handleOpenPurchaseModal}
                />
              )}
              {activeView === 'purchases' && (
                <PurchasesList 
                  purchases={state.purchases} 
                  cards={state.cards} 
                  categories={state.categories}
                  onDeletePurchase={deletePurchase} 
                />
              )}
              {activeView === 'invoices' && (
                <InvoiceView 
                  cards={state.cards} 
                  installments={allInstallments} 
                  paidInvoices={state.paidInvoices || []}
                  onTogglePaid={toggleInvoicePaid}
                />
              )}
              {activeView === 'analysis' && (
                <AnalysisView 
                  cards={state.cards} 
                  installments={allInstallments} 
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden bg-white border-t border-slate-200 grid grid-cols-5 h-16 sticky bottom-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as View)}
              className={cn(
                "flex flex-col items-center justify-center gap-1",
                activeView === item.id ? "text-violet-600 font-medium" : "text-slate-400"
              )}
            >
              <item.icon size={20} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>

      {/* Purchase Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsPurchaseModalOpen(false)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
          >
            <PurchaseForm 
               cards={state.cards} 
               categories={state.categories}
               initialCardId={preSelectedCardId}
               onAddCategory={addCategory}
               onUpdateCategory={updateCategory}
               onDeleteCategory={deleteCategory}
               onSubmit={(p) => {
                 addPurchase(p);
                 setIsPurchaseModalOpen(false);
               }}
               onCancel={() => setIsPurchaseModalOpen(false)}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}
