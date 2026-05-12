import React, { useState, useCallback } from 'react';
import { Upload, FileText, Check, AlertCircle, X, ChevronRight, CreditCard, PieChart, ShieldCheck, Zap, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseCSV } from '../lib/csv/parser';
import { NormalizedTransaction } from '../lib/csv/normalizer';
import { matchCardByFilename, matchCategoryByDescription } from '../lib/csv/matcher';
import { filterExistingTransactions } from '../lib/csv/deduplicator';
import { Card, Category } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CSVImporterProps {
  cards: Card[];
  categories: Category[];
  existingPurchases: any[];
  onImport: (transactions: any[], cardId: string) => Promise<void>;
  onClose: () => void;
}

export function CSVImporter({ cards, categories, existingPurchases, onImport, onClose }: CSVImporterProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, new: 0, duplicates: 0 });

  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    const result = await parseCSV(selectedFile);
    
    // Auto-detect card
    const detectedCard = matchCardByFilename(selectedFile.name, cards);
    if (detectedCard) setSelectedCardId(detectedCard.id);

    // Filter duplicates
    const newTransactions = filterExistingTransactions(result.transactions, existingPurchases);
    
    setTransactions(newTransactions);
    setImportStats({
      total: result.transactions.length,
      new: newTransactions.length,
      duplicates: result.transactions.length - newTransactions.length
    });
    
    setStep('preview');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.txt'))) {
      handleFile(droppedFile);
    }
  };

  const executeImport = async () => {
    if (!selectedCardId) return;
    setIsImporting(true);
    
    try {
      const dataToImport = transactions.map(t => ({
        ...t,
        cardId: selectedCardId,
        categoryId: matchCategoryByDescription(t.description, categories)
      }));
      
      await onImport(dataToImport, selectedCardId);
      setStep('success');
    } catch (error) {
      console.error('Import failed', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Importar Fatura CSV</h3>
              <p className="text-xs text-slate-500">Transforme sua exportação bancária em dados inteligentes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="h-full flex flex-col items-center justify-center py-12"
              >
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className="w-full max-w-lg border-2 border-dashed border-slate-200 rounded-[24px] p-12 flex flex-col items-center gap-6 hover:border-violet-300 hover:bg-violet-50/30 transition-all cursor-pointer group"
                  onClick={() => document.getElementById('csv-input')?.click()}
                >
                  <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={40} className="text-violet-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-700">Arraste seu arquivo aqui</p>
                    <p className="text-sm text-slate-500 mt-1">Formatos aceitos: .csv, .txt (Nubank, Inter, Itaú, etc)</p>
                  </div>
                  <input 
                    id="csv-input" 
                    type="file" 
                    accept=".csv,.txt" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
                  />
                  <button className="px-6 py-3 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all">
                    Selecionar Arquivo
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-6 mt-12 w-full max-w-2xl">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <ShieldCheck size={20} />
                    </div>
                    <p className="text-[11px] font-medium text-slate-500">Detecção Anti-Duplicidade</p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <PieChart size={20} />
                    </div>
                    <p className="text-[11px] font-medium text-slate-500">Categorização Inteligente</p>
                  </div>
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                      <CreditCard size={20} />
                    </div>
                    <p className="text-[11px] font-medium text-slate-500">Vínculo Automático de Cartão</p>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'preview' && (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Status Bar */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Arquivo</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{file?.name}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] uppercase font-black text-slate-400 mb-1">Total Detectado</p>
                    <p className="text-sm font-bold text-slate-700">{importStats.total} lançamentos</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] uppercase font-black text-emerald-400 mb-1">Novos</p>
                    <p className="text-sm font-bold text-emerald-700">{importStats.new} para importar</p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                    <p className="text-[10px] uppercase font-black text-rose-400 mb-1">Duplicados</p>
                    <p className="text-sm font-bold text-rose-700">{importStats.duplicates} ignorados</p>
                  </div>
                </div>

                {/* Card Selection */}
                <div className="bg-violet-50 p-6 rounded-2xl border border-violet-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-violet-600 shadow-sm">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Vincular ao Cartão</p>
                      <p className="text-xs text-slate-500">Confirme ou selecione o cartão desta fatura</p>
                    </div>
                  </div>
                  <select 
                    value={selectedCardId} 
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-violet-500 outline-none min-w-[200px]"
                  >
                    <option value="">Selecione o cartão...</option>
                    {cards.map(card => (
                      <option key={card.id} value={card.id}>{card.name}</option>
                    ))}
                  </select>
                </div>

                {/* Table Preview */}
                <div className="border rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Data</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Descrição</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Parcela</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {transactions.slice(0, 10).map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-slate-600">{format(t.date, 'dd/MM/yyyy')}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-800 uppercase">{t.description}</td>
                          <td className="px-4 py-3 text-xs font-bold text-slate-500">
                            {t.installments > 1 ? `${t.installmentIndex}/${t.installments}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs font-black text-slate-900 text-right">{formatCurrency(t.value)}</td>
                        </tr>
                      ))}
                      {transactions.length > 10 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center text-xs text-slate-400 bg-slate-50/50">
                            E mais {transactions.length - 10} lançamentos...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button 
                    onClick={() => setStep('upload')}
                    className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={executeImport}
                    disabled={!selectedCardId || isImporting}
                    className="flex items-center gap-2 px-8 py-3 bg-violet-600 text-white rounded-xl font-black shadow-xl shadow-violet-200 hover:bg-violet-700 disabled:opacity-50 disabled:shadow-none transition-all"
                  >
                    {isImporting ? 'Importando...' : 'Confirmar Importação'}
                    <ChevronRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                  <Check size={40} strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-black text-slate-800">Importação Concluída!</h3>
                <p className="text-slate-500 mt-2 max-w-md">
                  {importStats.new} novos lançamentos foram vinculados com sucesso ao seu cartão e o seu dashboard já foi atualizado.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-2xl font-black text-slate-800">{importStats.new}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Lançamentos</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-2xl font-black text-slate-800">{importStats.duplicates}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Duplicados</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="mt-10 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-slate-800 transition-all"
                >
                  Fechar e Ver Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
