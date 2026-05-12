import { Purchase } from '../../types';
import { NormalizedTransaction } from './normalizer';
import { format } from 'date-fns';

export function generateTransactionHash(t: NormalizedTransaction | Purchase): string {
  const dateStr = t instanceof Date ? format(t, 'yyyy-MM-dd') : 
                 (typeof t.date === 'string' ? t.date.split('T')[0] : format(t.date as Date, 'yyyy-MM-dd'));
  
  const description = 'description' in t ? t.description : t.name;
  const value = 'value' in t ? t.value : t.totalValue;

  // Simple hash based on date, description and value
  return `${dateStr}|${description.toLowerCase().trim()}|${value.toFixed(2)}`;
}

export function filterExistingTransactions(
  incoming: NormalizedTransaction[],
  existing: Purchase[]
): NormalizedTransaction[] {
  const existingHashes = new Set(existing.map(p => generateTransactionHash(p)));
  
  return incoming.filter(t => {
    const hash = generateTransactionHash(t);
    return !existingHashes.has(hash);
  });
}
