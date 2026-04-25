import React from 'react';
import { Bell, ShoppingBag, CreditCard, Info, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppNotification } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface NotificationDropdownProps {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: () => void;
}

export function NotificationDropdown({ notifications, isOpen, onClose, onMarkRead }: NotificationDropdownProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Notificações</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={onMarkRead}
                    className="text-[10px] font-bold text-violet-600 hover:underline flex items-center gap-1"
                  >
                    <Check size={12} /> Marcar como lidas
                  </button>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <Bell size={20} />
                    </div>
                    <p className="text-sm text-slate-400">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={cn(
                        "p-4 hover:bg-slate-50 transition-colors relative flex gap-3",
                        !n.read && "bg-violet-50/30"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                        n.type === 'purchase' ? "bg-emerald-100 text-emerald-600" :
                        n.type === 'card' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-600"
                      )}>
                        {n.type === 'purchase' ? <ShoppingBag size={14} /> :
                         n.type === 'card' ? <CreditCard size={14} /> : <Info size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm transition-colors", !n.read ? "font-bold text-slate-800" : "text-slate-600")}>
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate mb-1">{n.message}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {formatDistanceToNow(new Date(n.date), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 bg-violet-500 rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-3 bg-slate-50 text-center">
                <button className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                  Ver todas as atividades
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
