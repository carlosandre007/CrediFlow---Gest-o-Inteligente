import React, { useState } from 'react';
import { Zap, Shield, ArrowRight, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLogin: (user: { name: string, identifier: string }) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      onLogin({ name: 'Usuário', identifier });
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-violet-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl shadow-violet-200 mb-6"
          >
            <Zap size={40} fill="white" />
          </motion.div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">CrediFlow</h1>
          <p className="text-slate-500 font-medium">Gestão Financeira Inteligente</p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/60 border border-slate-100"
        >
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                CPF ou CNPJ
              </label>
              <div className="relative">
                 <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input 
                   type="text" 
                   required
                   placeholder="000.000.000-00"
                   className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-violet-500 transition-all font-medium"
                   value={identifier}
                   onChange={e => setIdentifier(e.target.value)}
                 />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                Senha de Acesso
              </label>
              <div className="relative">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                 <input 
                   type="password" 
                   required
                   placeholder="••••••••"
                   className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-violet-500 transition-all"
                   value={password}
                   onChange={e => setPassword(e.target.value)}
                 />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl py-4 font-bold shadow-lg shadow-slate-300 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>Entrar na Conta <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-center gap-6">
             <button className="text-xs font-bold text-slate-400 hover:text-violet-600 transition-colors">Esqueci minha senha</button>
             <button className="text-xs font-bold text-slate-400 hover:text-violet-600 transition-colors">Criar conta grátis</button>
          </div>
        </motion.div>
        
        <p className="mt-10 text-center text-xs text-slate-400">
           Protegido por criptografia de ponta a ponta.<br/>
           © 2026 CrediFlow Tecnologia Financeira LTDA.
        </p>
      </div>
    </div>
  );
}
