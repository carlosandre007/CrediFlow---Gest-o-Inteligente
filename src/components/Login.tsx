import React, { useState } from 'react';
import { Zap, Shield, ArrowRight, Lock, Mail, AlertCircle, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: { name: string, identifier: string }) => void;
}

type AuthMode = 'login' | 'signup' | 'forgotPassword';

export function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          onLogin({ 
            name: data.user.user_metadata.full_name || 'Usuário', 
            identifier: data.user.email || '' 
          });
        }
      } else if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });

        if (authError) throw authError;

        if (data.user) {
          setSuccessMessage('Conta criada com sucesso! Você já pode entrar.');
          setMode('login');
          setPassword('');
        }
      } else if (mode === 'forgotPassword') {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });

        if (authError) throw authError;

        setSuccessMessage('Link de recuperação enviado para o seu e-mail!');
      }
    } catch (err: any) {
      if (err.message === 'Invalid login credentials') {
        setError('E-mail ou senha incorretos.');
      } else if (err.message === 'User already registered') {
        setError('Este e-mail já está cadastrado.');
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
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
          layout
          className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-8 flex items-center gap-4">
                {mode !== 'login' && (
                  <button 
                    onClick={() => toggleMode('login')}
                    className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
                <h2 className="text-2xl font-bold text-slate-900">
                  {mode === 'login' && 'Bem-vindo de volta'}
                  {mode === 'signup' && 'Criar sua conta'}
                  {mode === 'forgotPassword' && 'Recuperar senha'}
                </h2>
              </div>

              {error && (
                <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl text-sm flex items-center gap-3 font-medium">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mb-6 bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-2xl text-sm flex items-center gap-3 font-medium">
                  <CheckCircle2 size={18} />
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-5">
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Nome Completo
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: João Silva"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-violet-500 transition-all font-medium"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    E-mail de Acesso
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="email" 
                      required
                      placeholder="seu@email.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-violet-500 transition-all font-medium"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {mode !== 'forgotPassword' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Sua Senha
                      </label>
                      {mode === 'login' && (
                        <button 
                          type="button"
                          onClick={() => toggleMode('forgotPassword')}
                          className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors"
                        >
                          Esqueceu?
                        </button>
                      )}
                    </div>
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
                )}

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-black text-white rounded-2xl py-4 font-bold shadow-lg shadow-slate-300 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 mt-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {mode === 'login' && 'Entrar na Conta'}
                      {mode === 'signup' && 'Criar Minha Conta'}
                      {mode === 'forgotPassword' && 'Enviar Link'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-slate-50 text-center">
                {mode === 'login' ? (
                  <p className="text-sm text-slate-500 font-medium">
                    Não tem uma conta?{' '}
                    <button 
                      onClick={() => toggleMode('signup')}
                      className="text-violet-600 font-bold hover:text-violet-700 transition-colors"
                    >
                      Cadastre-se grátis
                    </button>
                  </p>
                ) : (
                  <button 
                    onClick={() => toggleMode('login')}
                    className="text-sm text-slate-500 font-bold hover:text-violet-600 transition-colors"
                  >
                    Voltar para o login
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
        
        <p className="mt-10 text-center text-xs text-slate-400">
           Protegido por criptografia de ponta a ponta.<br/>
           © 2026 CrediFlow Tecnologia Financeira LTDA.
        </p>
      </div>
    </div>
  );
}
