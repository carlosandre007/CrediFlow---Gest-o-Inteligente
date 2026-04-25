import React, { useState } from 'react';
import { FileText, Upload, Check, AlertCircle, Loader2, X, CreditCard, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractTextFromFile, ExtractionError } from '../lib/ocr';
import { analyzeInvoiceText, ExtractedInvoiceData, AIError, ValidationResult } from '../lib/ai';
import { formatCurrency } from '../lib/utils';
import { Card } from '../types';

interface InvoiceScannerProps {
  cards: Card[];
  onImport: (data: ExtractedInvoiceData, cardId: string) => Promise<void>;
  onClose: () => void;
}

// Mapa de mensagens de erro amigáveis por etapa
const ERROR_MESSAGES: Record<string, { title: string; tip: string }> = {
  // Erros de OCR
  'upload': {
    title: '📁 Erro no Arquivo',
    tip: 'Verifique se o arquivo não está corrompido. Tente baixar novamente ou use outro formato (PDF, JPG, PNG).'
  },
  'pdf_read': {
    title: '📄 Erro ao Ler PDF',
    tip: 'O PDF pode estar protegido ou corrompido. Tente tirar uma foto da fatura ou salvar como imagem.'
  },
  'ocr': {
    title: '🔍 Erro no Reconhecimento (OCR)',
    tip: 'A imagem pode estar com baixa qualidade. Tente uma foto com boa iluminação, sem reflexos e com o texto legível.'
  },
  'empty_text': {
    title: '📝 Texto Não Encontrado',
    tip: 'O sistema não conseguiu identificar texto no arquivo. Use um PDF digital (não escaneado) ou uma foto mais nítida.'
  },
  // Erros de IA
  'api_key': {
    title: '🔑 Configuração Incompleta',
    tip: 'A chave de API do Gemini não está configurada. Verifique o arquivo .env do projeto.'
  },
  'api_call': {
    title: '🤖 Erro na Análise IA',
    tip: 'A IA não conseguiu processar a fatura. Isso pode ser temporário. Tente novamente em alguns segundos.'
  },
  'json_parse': {
    title: '⚙️ Erro ao Interpretar Dados',
    tip: 'A IA retornou dados em formato inesperado. Tente novamente — geralmente funciona na segunda tentativa.'
  },
  'validation': {
    title: '⚠️ Dados Incompletos',
    tip: 'A IA não conseguiu extrair todas as informações necessárias. Verifique se o arquivo contém uma fatura completa.'
  },
  'save': {
    title: '💾 Erro ao Salvar',
    tip: 'Não foi possível salvar os dados no banco. Verifique sua conexão e tente novamente.'
  },
  'unknown': {
    title: '❌ Erro Inesperado',
    tip: 'Ocorreu um erro inesperado. Tente novamente ou use outro arquivo.'
  }
};

type ScannerStatus = 'idle' | 'reading' | 'analyzing' | 'review' | 'importing';

export function InvoiceScanner({ cards, onImport, onClose }: InvoiceScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [result, setResult] = useState<ExtractedInvoiceData | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [error, setError] = useState<{ stage: string; message: string } | null>(null);
  const [progressText, setProgressText] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
      setValidation(null);
      startAutoProcessing(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setError(null);
      setValidation(null);
      startAutoProcessing(droppedFile);
    }
  };

  const startAutoProcessing = async (selectedFile: File) => {
    console.log(`\n${'🚀'.repeat(20)}`);
    console.log(`[SCANNER] PIPELINE COMPLETO INICIADO`);
    console.log(`[SCANNER] Arquivo: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`);
    console.log(`${'🚀'.repeat(20)}\n`);

    try {
      // ── VERIFICAÇÃO DA API KEY ──
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey.trim() === '') {
        throw new AIError(
          'Chave de API do Gemini (VITE_GEMINI_API_KEY) não encontrada no .env.',
          'api_key'
        );
      }

      // ── ETAPA 1: EXTRAÇÃO DE TEXTO ──
      setStatus('reading');
      setProgressText('Extraindo texto do arquivo...');
      console.log(`[SCANNER] ── ETAPA 1: Extração de texto ──`);

      const text = await extractTextFromFile(selectedFile);

      console.log(`[SCANNER] Texto extraído com sucesso!`);
      console.log(`[SCANNER] Texto vazio? ${!text || text.trim().length < 10}`);
      console.log(`[SCANNER] Comprimento: ${text.trim().length} chars`);
      console.log(`[SCANNER] Preview (500 chars): "${text.substring(0, 500).replace(/\n/g, ' ')}"`);

      if (!text || text.trim().length < 10) {
        throw new ExtractionError(
          'O texto extraído é muito curto. O arquivo pode não conter uma fatura legível.',
          'empty_text'
        );
      }

      // ── ETAPA 2: ANÁLISE PELA IA ──
      setStatus('analyzing');
      setProgressText('IA analisando lançamentos...');
      console.log(`[SCANNER] ── ETAPA 2: Análise pela IA ──`);

      const { data, validation: validationResult } = await analyzeInvoiceText(text);

      console.log(`[SCANNER] Dados processados pela IA:`);
      console.log(`[SCANNER] → Cartão: ${data.card_name}`);
      console.log(`[SCANNER] → Banco: ${data.bank}`);
      console.log(`[SCANNER] → Vencimento: ${data.due_date}`);
      console.log(`[SCANNER] → Total: R$ ${data.total_amount}`);
      console.log(`[SCANNER] → Transações: ${data.transactions.length}`);
      console.log(`[SCANNER] → Validação: ${validationResult.valid ? '✅' : '⚠️'}`);

      if (validationResult.warnings.length > 0) {
        console.log(`[SCANNER] ⚠️ Avisos:`, validationResult.warnings);
      }

      // Verificar se tem transações mesmo com avisos
      if (data.transactions.length === 0) {
        throw new AIError(
          'A IA não encontrou nenhuma transação na fatura. Verifique se o arquivo contém lançamentos.',
          'validation'
        );
      }

      // ── ETAPA 3: REVISÃO ──
      console.log(`[SCANNER] ── ETAPA 3: Aguardando revisão do usuário ──`);

      // Tentar identificar o cartão automaticamente
      const matchedCard = cards.find(c =>
        data.card_name?.toLowerCase().includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(data.card_name?.toLowerCase()) ||
        data.bank?.toLowerCase().includes(c.bank?.toLowerCase()) ||
        c.bank?.toLowerCase().includes(data.bank?.toLowerCase())
      );

      if (matchedCard) {
        console.log(`[SCANNER] Cartão detectado automaticamente: ${matchedCard.name}`);
        setSelectedCardId(matchedCard.id);
      } else {
        console.log(`[SCANNER] Nenhum cartão correspondente encontrado. Usuário precisa selecionar.`);
      }

      setResult(data);
      setValidation(validationResult);
      setStatus('review');

    } catch (err: any) {
      console.error(`[SCANNER] ❌ ERRO NO PIPELINE:`, err);

      // Determinar a etapa do erro
      let stage = 'unknown';
      let message = err.message || 'Falha ao processar fatura.';

      if (err instanceof ExtractionError) {
        stage = err.stage;
      } else if (err instanceof AIError) {
        stage = err.stage;
      } else if (err.message?.includes('API key') || err.message?.includes('API_KEY')) {
        stage = 'api_key';
      }

      setError({ stage, message });
      setStatus('idle');
      setFile(null);
    }
  };

  const confirmImport = async () => {
    if (!result || !selectedCardId) return;

    setStatus('importing');
    setProgressText('Salvando dados no banco...');
    console.log(`[SCANNER] ── ETAPA 4: Salvando no banco ──`);
    console.log(`[SCANNER] Cartão selecionado: ${selectedCardId}`);
    console.log(`[SCANNER] Transações a importar: ${result.transactions.length}`);

    try {
      await onImport(result, selectedCardId);
      console.log(`[SCANNER] ✅ Importação concluída com sucesso!`);
      onClose();
    } catch (err: any) {
      console.error(`[SCANNER] ❌ Erro ao salvar no banco:`, err);
      setError({
        stage: 'save',
        message: err.message || 'Erro ao salvar dados no banco de dados.'
      });
      setStatus('review');
    }
  };

  const resetAndRetry = () => {
    setFile(null);
    setResult(null);
    setValidation(null);
    setError(null);
    setStatus('idle');
    setProgressText('');
  };

  const errorInfo = error ? (ERROR_MESSAGES[error.stage] || ERROR_MESSAGES['unknown']) : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Scanner de Fatura IA</h3>
              <p className="text-sm text-slate-500">Importação inteligente via OCR + Gemini</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Estado: Upload (Idle) */}
          {status === 'idle' && !error && (
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 hover:bg-violet-50 hover:border-violet-200 transition-all cursor-pointer group"
            >
              <Upload size={48} className="text-slate-300 mb-4 group-hover:text-violet-400 group-hover:-translate-y-1 transition-all" />
              <p className="text-slate-600 font-medium mb-1 text-center px-4">Solte sua fatura aqui</p>
              <p className="text-xs text-slate-400 mb-6 text-center">Ou clique para selecionar (PDF, JPG, PNG)</p>
              <input type="file" onChange={handleFileChange} className="hidden" id="file-upload" accept=".pdf,image/*" />
              <label htmlFor="file-upload" className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors shadow-sm">
                Selecionar Arquivo
              </label>
            </div>
          )}

          {/* Estado: Processando */}
          {(status === 'reading' || status === 'analyzing' || status === 'importing') && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={48} className="text-violet-600 animate-spin mb-4" />
              <h4 className="text-lg font-bold text-slate-800 mb-1">
                {status === 'reading' && 'Extraindo texto da fatura...'}
                {status === 'analyzing' && 'IA analisando lançamentos...'}
                {status === 'importing' && 'Salvando dados...'}
              </h4>
              <p className="text-sm text-slate-500">{progressText}</p>

              {/* Indicador de progresso visual */}
              <div className="flex items-center gap-2 mt-8">
                <div className={`w-3 h-3 rounded-full transition-all ${status === 'reading' || status === 'analyzing' || status === 'importing' ? 'bg-violet-600 scale-110' : 'bg-slate-200'}`} />
                <div className={`w-12 h-0.5 ${status === 'analyzing' || status === 'importing' ? 'bg-violet-600' : 'bg-slate-200'}`} />
                <div className={`w-3 h-3 rounded-full transition-all ${status === 'analyzing' || status === 'importing' ? 'bg-violet-600 scale-110' : 'bg-slate-200'}`} />
                <div className={`w-12 h-0.5 ${status === 'importing' ? 'bg-violet-600' : 'bg-slate-200'}`} />
                <div className={`w-3 h-3 rounded-full transition-all ${status === 'importing' ? 'bg-violet-600 scale-110' : 'bg-slate-200'}`} />
              </div>
              <div className="flex items-center gap-6 mt-2 text-[10px] text-slate-400 font-medium uppercase">
                <span className={status === 'reading' ? 'text-violet-600' : ''}>Leitura</span>
                <span className={status === 'analyzing' ? 'text-violet-600' : ''}>Análise IA</span>
                <span className={status === 'importing' ? 'text-violet-600' : ''}>Salvando</span>
              </div>
            </div>
          )}

          {/* Estado: Revisão */}
          {status === 'review' && result && (
            <div className="space-y-6">
              {/* Avisos de validação */}
              {validation && validation.warnings.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <p className="text-xs font-bold text-amber-700 uppercase">Avisos</p>
                  </div>
                  <ul className="space-y-1">
                    {validation.warnings.map((w, i) => (
                      <li key={i} className="text-xs text-amber-600 flex items-start gap-1.5">
                        <span className="mt-0.5">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resumo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100">
                  <p className="text-[10px] font-black text-violet-400 uppercase mb-1">Cartão Detectado</p>
                  <p className="text-lg font-bold text-violet-900">{result.card_name || "Desconhecido"}</p>
                  <p className="text-xs text-violet-600/70">{result.bank}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Valor Total</p>
                  <p className="text-lg font-bold text-slate-800">{formatCurrency(result.total_amount)}</p>
                  <p className="text-xs text-slate-500">
                    {result.due_date ? `Vencimento: ${result.due_date}` : 'Vencimento não identificado'}
                  </p>
                </div>
              </div>

              {/* Lista de transações */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Lançamentos Encontrados ({result.transactions.length})
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Importar para:</span>
                    <select
                      value={selectedCardId}
                      onChange={(e) => setSelectedCardId(e.target.value)}
                      className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-1"
                    >
                      <option value="">Selecione um cartão...</option>
                      {cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {result.transactions.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400">
                          <CreditCard size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{t.description}</p>
                          <p className="text-[10px] text-slate-400">
                            {t.date} • {t.total_installments > 1 ? `Parcela ${t.installment}/${t.total_installments}` : 'À vista'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-slate-800">{formatCurrency(t.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Estado: Erro */}
          {error && errorInfo && (
            <div className="space-y-4">
              <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle size={24} className="text-rose-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-rose-800 mb-1">{errorInfo.title}</h4>
                    <p className="text-sm text-rose-600 mb-3">{error.message}</p>
                    <div className="flex items-start gap-2 p-3 bg-rose-100/50 rounded-xl">
                      <Info size={14} className="text-rose-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-rose-500">{errorInfo.tip}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={resetAndRetry}
                className="w-full bg-violet-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-violet-700 transition-all"
              >
                🔄 Tentar Novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-white transition-colors">
            Cancelar
          </button>
          {status === 'review' && (
            <button
              disabled={!selectedCardId}
              onClick={confirmImport}
              className="bg-violet-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-violet-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Check size={18} />
              Confirmar Importação ({result?.transactions.length} lançamentos)
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
