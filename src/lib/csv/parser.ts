import Papa from 'papaparse';
import { normalizeRow, NormalizedTransaction } from './normalizer';
import { detectInstallments } from './matcher';

export interface ParseResult {
  transactions: NormalizedTransaction[];
  errors: string[];
}

export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      delimitersToGuess: [',', ';', '\t', '|', ':'],
      encoding: "UTF-8",
      complete: (results) => {
        const transactions: NormalizedTransaction[] = [];
        const data = results.data as any[][];
        
        // 1. Find the header row
        const headerKeywords = ['data', 'date', 'descrição', 'description', 'valor', 'amount', 'title', 'item', 'estabelecimento'];
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(data.length, 20); i++) {
          const row = data[i];
          const hasKeywords = row.some(cell => 
            typeof cell === 'string' && 
            headerKeywords.some(kw => cell.toLowerCase().includes(kw))
          );
          if (hasKeywords) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          // If no header found, assume it starts at row 0 (or fails later)
          headerRowIndex = 0;
        }

        const headers = data[headerRowIndex].map(h => String(h || '').toLowerCase().trim());
        const rows = data.slice(headerRowIndex + 1);

        rows.forEach((rowData) => {
          // Convert array row to object using headers
          const rowObj: Record<string, any> = {};
          headers.forEach((h, idx) => {
            if (h) rowObj[h] = rowData[idx];
          });

          const normalized = normalizeRow(rowObj);
          if (normalized) {
            // Check for installments in description OR in the dedicated column (stored temporarily in categoryName)
            let installmentData = detectInstallments(normalized.description);
            
            if (!installmentData && normalized.categoryName) {
              installmentData = detectInstallments(normalized.categoryName);
            }

            if (installmentData) {
              normalized.installments = installmentData.total;
              normalized.installmentIndex = installmentData.current;
            }

            // Clear temporary storage
            normalized.categoryName = undefined;
            
            transactions.push(normalized);
          }
        });

        resolve({ transactions, errors: [] });
      },
      error: (error) => {
        resolve({ transactions: [], errors: [error.message] });
      }
    });
  });
}
