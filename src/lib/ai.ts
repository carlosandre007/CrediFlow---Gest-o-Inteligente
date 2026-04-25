import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 
                (typeof process !== 'undefined' ? (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY) : '');

const genAI = new GoogleGenerativeAI(API_KEY as string);

// ============================================================
// TIPOS
// ============================================================
export interface ExtractedInvoiceData {
  card_name: string;
  bank: string;
  due_date: string;
  total_amount: number;
  transactions: {
    description: string;
    date: string;
    amount: number;
    installment: number;
    total_installments: number;
  }[];
}

// ============================================================
// ERROS ESPECÍFICOS DA IA
// ============================================================
export type AIStage = 'api_key' | 'api_call' | 'json_parse' | 'validation';

export class AIError extends Error {
  stage: AIStage;

  constructor(message: string, stage: AIStage) {
    super(message);
    this.name = 'AIError';
    this.stage = stage;
  }
}

// ============================================================
// PROMPT OTIMIZADO (força JSON puro, sem markdown)
// ============================================================
function buildPrompt(text: string): string {
  const currentYear = new Date().getFullYear();

  return `Analise o texto de uma fatura de cartão de crédito brasileira e retorne EXCLUSIVAMENTE um JSON válido.

INSTRUÇÕES OBRIGATÓRIAS:
- Retorne APENAS o JSON. Sem explicações, sem markdown, sem \`\`\`json.
- Se não identificar um campo, use string vazia "" ou 0.
- Datas no formato YYYY-MM-DD. Se o ano não aparecer, use ${currentYear}.
- Valores monetários como número decimal (ex: 149.90, não "R$ 149,90").
- Para parcelas tipo "02/10", use installment=2, total_installments=10.
- Para compras à vista, use installment=1, total_installments=1.
- Ignore linhas de pagamento, juros, IOF, encargos. Foque em COMPRAS.
- Limpe descrições (remova prefixos como "COMPRA CARTAO", "PAGTO ELETRON").

FORMATO EXATO DO JSON:
{"card_name":"nome do cartão","bank":"nome do banco","due_date":"YYYY-MM-DD","total_amount":0.00,"transactions":[{"description":"descrição limpa","date":"YYYY-MM-DD","amount":0.00,"installment":1,"total_installments":1}]}

TEXTO DA FATURA:
${text}`;
}

// ============================================================
// EXTRAÇÃO DE JSON DA RESPOSTA (múltiplas estratégias)
// ============================================================
function extractJSON(raw: string): string {
  console.log(`[IA][Parser] Tentando extrair JSON da resposta (${raw.length} chars)...`);

  // Estratégia 1: Remover blocos markdown ```json ... ```
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  // Estratégia 2: Tentar parse direto
  try {
    JSON.parse(cleaned);
    console.log(`[IA][Parser] ✅ JSON válido após limpeza de markdown.`);
    return cleaned;
  } catch (_) {
    // continua
  }

  // Estratégia 3: Extrair o primeiro bloco { ... } completo via contagem de chaves
  const startIdx = cleaned.indexOf('{');
  if (startIdx !== -1) {
    let depth = 0;
    let endIdx = -1;

    for (let i = startIdx; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      if (cleaned[i] === '}') depth--;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }

    if (endIdx !== -1) {
      const extracted = cleaned.substring(startIdx, endIdx + 1);
      try {
        JSON.parse(extracted);
        console.log(`[IA][Parser] ✅ JSON extraído via contagem de chaves.`);
        return extracted;
      } catch (_) {
        // continua
      }
    }
  }

  // Estratégia 4: Regex agressivo
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      JSON.parse(jsonMatch[0]);
      console.log(`[IA][Parser] ✅ JSON extraído via regex.`);
      return jsonMatch[0];
    } catch (_) {
      // continua
    }
  }

  // Estratégia 5: Corrigir problemas comuns
  const fixAttempts = [
    // Trailing comma antes de } ou ]
    () => {
      const fixed = cleaned
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return fixed;
    },
    // Aspas simples → duplas
    () => {
      return cleaned.replace(/'/g, '"');
    }
  ];

  for (const fix of fixAttempts) {
    try {
      const fixed = fix();
      const extracted = fixed.substring(fixed.indexOf('{'));
      JSON.parse(extracted);
      console.log(`[IA][Parser] ✅ JSON recuperado após correção automática.`);
      return extracted;
    } catch (_) {
      // próxima tentativa
    }
  }

  console.error(`[IA][Parser] ❌ Impossível extrair JSON válido.`);
  console.error(`[IA][Parser] Resposta bruta:`, raw);
  throw new AIError(
    'A IA retornou uma resposta que não contém JSON válido. Tente novamente.',
    'json_parse'
  );
}

// ============================================================
// VALIDAÇÃO DOS DADOS EXTRAÍDOS
// ============================================================
export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

function validateExtractedData(data: any): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  console.log(`[IA][Validação] Validando dados extraídos...`);

  // Garantir que os campos existem com defaults
  if (!data.card_name || data.card_name.trim() === '') {
    warnings.push('Nome do cartão não identificado.');
    data.card_name = 'Cartão não identificado';
  }

  if (!data.bank || data.bank.trim() === '') {
    warnings.push('Banco não identificado.');
    data.bank = 'Banco não identificado';
  }

  if (!data.due_date || data.due_date.trim() === '') {
    warnings.push('Data de vencimento não encontrada na fatura.');
    data.due_date = '';
  } else {
    // Validar formato de data
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.due_date)) {
      warnings.push(`Data de vencimento em formato inesperado: "${data.due_date}".`);
    }
  }

  if (data.total_amount === undefined || data.total_amount === null || isNaN(Number(data.total_amount))) {
    warnings.push('Valor total da fatura não identificado.');
    data.total_amount = 0;
  } else {
    data.total_amount = Number(data.total_amount);
  }

  if (!Array.isArray(data.transactions)) {
    errors.push('Nenhuma transação encontrada na fatura.');
    data.transactions = [];
  } else if (data.transactions.length === 0) {
    errors.push('A IA não conseguiu identificar nenhum lançamento na fatura.');
  } else {
    // Validar e corrigir cada transação
    data.transactions = data.transactions.map((t: any, idx: number) => {
      const cleaned = {
        description: t.description || `Transação ${idx + 1}`,
        date: t.date || '',
        amount: Number(t.amount) || 0,
        installment: Number(t.installment) || 1,
        total_installments: Number(t.total_installments) || 1,
      };

      if (cleaned.amount <= 0) {
        warnings.push(`Transação "${cleaned.description}" com valor inválido (${cleaned.amount}).`);
      }

      if (cleaned.installment > cleaned.total_installments) {
        cleaned.installment = cleaned.total_installments;
      }

      return cleaned;
    });

    // Remover transações com valor 0
    const originalCount = data.transactions.length;
    data.transactions = data.transactions.filter((t: any) => t.amount > 0);
    if (data.transactions.length < originalCount) {
      warnings.push(`${originalCount - data.transactions.length} transação(ões) com valor zero foram removidas.`);
    }
  }

  const valid = errors.length === 0 && data.transactions.length > 0;

  console.log(`[IA][Validação] Resultado: ${valid ? '✅ Válido' : '❌ Inválido'}`);
  if (warnings.length > 0) console.log(`[IA][Validação] Avisos:`, warnings);
  if (errors.length > 0) console.log(`[IA][Validação] Erros:`, errors);

  return { valid, warnings, errors };
}

// ============================================================
// FUNÇÃO PRINCIPAL: Análise com retry automático
// ============================================================
const MAX_RETRIES = 3;

export async function analyzeInvoiceText(
  text: string, 
  retryCount = 0
): Promise<{ data: ExtractedInvoiceData; validation: ValidationResult }> {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`[IA] ANÁLISE INICIADA (Tentativa ${retryCount + 1}/${MAX_RETRIES})`);
  console.log(`[IA] Texto recebido: ${text.length} caracteres`);
  console.log(`[IA] Preview: "${text.substring(0, 300).replace(/\n/g, ' ')}..."`);
  console.log(`${'─'.repeat(60)}`);

  // Verificar API Key
  if (!API_KEY || API_KEY.trim() === '') {
    throw new AIError(
      'Chave de API do Gemini não configurada. Verifique o arquivo .env (VITE_GEMINI_API_KEY).',
      'api_key'
    );
  }

  // Verificar texto
  if (!text || text.trim().length < 10) {
    throw new AIError(
      'O texto extraído é muito curto para análise. Verifique a qualidade do arquivo.',
      'api_call'
    );
  }

  // Lista de modelos em ordem de preferência (fallback automático)
  const MODELS = ["gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];
  const modelName = MODELS[Math.min(retryCount, MODELS.length - 1)];

  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.1, // Mais determinístico para extração de dados
      maxOutputTokens: 8192,
    }
  });

  console.log(`[IA] Modelo selecionado: ${modelName}`);

  const prompt = buildPrompt(text);

  try {
    console.log(`[IA] Enviando para Gemini API...`);
    const startTime = Date.now();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawResponse = response.text();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[IA] Resposta recebida em ${elapsed}s (${rawResponse.length} chars)`);
    console.log(`[IA] Resposta bruta:`, rawResponse);

    // Extrair JSON da resposta
    const jsonText = extractJSON(rawResponse);
    
    // Parse do JSON
    let parsed: ExtractedInvoiceData;
    try {
      parsed = JSON.parse(jsonText);
      console.log(`[IA] ✅ JSON parseado com sucesso!`);
    } catch (parseErr: any) {
      console.error(`[IA] ❌ Falha no JSON.parse:`, parseErr.message);
      throw new AIError(
        'A resposta da IA não contém um JSON válido.',
        'json_parse'
      );
    }

    // Validar dados
    const validation = validateExtractedData(parsed);
    
    console.log(`[IA] Dados finais processados:`, JSON.stringify(parsed, null, 2));
    console.log(`[IA] Transações encontradas: ${parsed.transactions.length}`);
    console.log(`[IA] Valor total: R$ ${parsed.total_amount}`);
    console.log(`[IA] Vencimento: ${parsed.due_date}`);

    // Se não encontrou nenhuma transação e ainda pode tentar de novo
    if (!validation.valid && retryCount < MAX_RETRIES - 1) {
      console.log(`[IA] ⚠️ Dados inválidos. Retentando com prompt mais agressivo...`);
      return analyzeInvoiceText(text, retryCount + 1);
    }

    return { data: parsed, validation };

  } catch (error: any) {
    // Se já é um AIError nosso, propagar
    if (error instanceof AIError) {
      // Tentar retry para erros de parse
      if (error.stage === 'json_parse' && retryCount < MAX_RETRIES - 1) {
        console.log(`[IA] Retentando após erro de parse...`);
        return analyzeInvoiceText(text, retryCount + 1);
      }
      throw error;
    }

    console.error(`[IA] ❌ Erro na chamada da API (Tentativa ${retryCount + 1}):`, error);

    // Verificar tipos específicos de erro da API
    const errorMsg = error.message || '';
    
    if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) {
      throw new AIError(
        'A chave de API do Gemini é inválida. Verifique o .env e gere uma nova chave em ai.google.dev.',
        'api_key'
      );
    }

    if (errorMsg.includes('QUOTA') || errorMsg.includes('quota') || errorMsg.includes('429')) {
      throw new AIError(
        'Limite de uso da API atingido. Aguarde alguns minutos e tente novamente.',
        'api_call'
      );
    }

    if (errorMsg.includes('SAFETY') || errorMsg.includes('blocked')) {
      throw new AIError(
        'A IA bloqueou a análise por questões de segurança. Tente com outro arquivo.',
        'api_call'
      );
    }

    // Retry para erros genéricos de rede/API
    if (retryCount < MAX_RETRIES - 1) {
      const delay = (retryCount + 1) * 2000;
      console.log(`[IA] Aguardando ${delay / 1000}s antes de retentar...`);
      await new Promise(r => setTimeout(r, delay));
      return analyzeInvoiceText(text, retryCount + 1);
    }

    throw new AIError(
      `A IA falhou após ${MAX_RETRIES} tentativas. Erro: ${errorMsg || 'Erro desconhecido.'}`,
      'api_call'
    );
  }
}
