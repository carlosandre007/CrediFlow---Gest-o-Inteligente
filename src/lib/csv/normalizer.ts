import { parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface NormalizedTransaction {
  date: Date;
  description: string;
  value: number;
  installments: number;
  installmentIndex: number;
  categoryName?: string;
  externalId?: string;
}

const DATE_FORMATS = ['dd/MM/yyyy', 'yyyy-MM-dd', 'dd/MM/yy', 'MM/dd/yyyy'];

function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(dateStr.trim(), fmt, new Date());
    if (isValid(parsed)) return parsed;
  }
  
  const timestamp = Date.parse(dateStr);
  if (!isNaN(timestamp)) return new Date(timestamp);
  
  return null;
}

function parseBrazilianValue(valueStr: string): number {
  if (typeof valueStr === 'number') return valueStr;
  if (!valueStr) return 0;
  
  // Remove currency symbols and handle thousands/decimals
  // Example: "R$ 1.234,56" -> 1234.56
  // Example: "1,234.56" -> 1234.56
  let clean = valueStr.replace(/[R$\s]/g, '');
  
  if (clean.includes(',') && clean.includes('.')) {
    // Determine which is the separator
    if (clean.indexOf('.') < clean.indexOf(',')) {
      // 1.234,56
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',')) {
    // 1234,56
    clean = clean.replace(',', '.');
  }
  
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

const HEADER_MAPS: Record<string, string[]> = {
  date: ['data de compra', 'data', 'date', 'lançamento', 'vencimento', 'transação', 'dia', 'compra', 'periodo', 'time'],
  description: ['descrição', 'description', 'histórico', 'detalhe', 'estabelecimento', 'merchant', 'item', 'lançamento', 'title', 'título', 'nome'],
  value: ['valor (em r$)', 'valor total', 'valor', 'amount', 'preço', 'quantia', 'valor pago', 'valor da parcela', 'pago'],
  installments: ['parcela', 'prestação', 'nº parcela', 'vencimento da parcela']
};

export function normalizeRow(row: Record<string, any>): NormalizedTransaction | null {
  let date: Date | null = null;
  let description = '';
  let value = 0;
  let installmentsRaw = '';

  const originalKeys = Object.keys(row);

  // Helper to find a key that matches one of our headers (priority to exact match)
  const findKey = (searchHeaders: string[]) => {
    // 1. Try exact match
    const exactMatch = originalKeys.find(k => {
      const lowerKey = k.toLowerCase().trim();
      return searchHeaders.some(h => lowerKey === h);
    });
    if (exactMatch) return exactMatch;

    // 2. Try partial match
    return originalKeys.find(k => {
      const lowerKey = k.toLowerCase().trim();
      return searchHeaders.some(h => lowerKey.includes(h));
    });
  };

  // Find date
  const dateKey = findKey(HEADER_MAPS.date);
  if (dateKey) {
    date = parseFlexibleDate(String(row[dateKey]));
  }

  // Find description
  const descKey = findKey(HEADER_MAPS.description);
  if (descKey) {
    description = String(row[descKey]).trim();
  }

  // Find value
  const valueKey = findKey(HEADER_MAPS.value);
  if (valueKey) {
    value = parseBrazilianValue(String(row[valueKey]));
  }

  // Find installments column
  const instKey = findKey(HEADER_MAPS.installments);
  if (instKey) {
    installmentsRaw = String(row[instKey]).trim();
  }

  if (!date || !description || value === 0) return null;

  const isCredit = /pagamento|recebido|estorno|crédito|credit|payment/i.test(description);
  if (isCredit) return null;

  return {
    date,
    description,
    value: Math.abs(value),
    installments: 1,
    installmentIndex: 1,
    categoryName: installmentsRaw // Temporary storage to pass to parser
  };
}
