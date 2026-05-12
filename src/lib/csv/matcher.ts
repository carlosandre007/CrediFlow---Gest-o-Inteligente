import { Card, Category } from '../../types';

export function matchCardByFilename(filename: string, cards: Card[]): Card | null {
  const normalizedFilename = filename.toLowerCase();
  
  for (const card of cards) {
    const cardName = card.name.toLowerCase();
    const bank = card.bank.toLowerCase();
    
    if (normalizedFilename.includes(cardName) || (bank && normalizedFilename.includes(bank))) {
      return card;
    }
  }
  
  // Specific bank patterns
  if (normalizedFilename.includes('nubank')) return cards.find(c => c.bank.toLowerCase().includes('nu') || c.name.toLowerCase().includes('nu')) || null;
  if (normalizedFilename.includes('inter')) return cards.find(c => c.bank.toLowerCase().includes('inter') || c.name.toLowerCase().includes('inter')) || null;
  if (normalizedFilename.includes('itau')) return cards.find(c => c.bank.toLowerCase().includes('itau') || c.name.toLowerCase().includes('itau')) || null;
  if (normalizedFilename.includes('bradesco')) return cards.find(c => c.bank.toLowerCase().includes('bradesco')) || null;
  if (normalizedFilename.includes('santander')) return cards.find(c => c.bank.toLowerCase().includes('santander')) || null;
  
  return null;
}

export const MERCHANT_MAP: Record<string, string> = {
  'IFOOD': 'Alimentação',
  'UBER': 'Transporte',
  '99APP': 'Transporte',
  'NETFLIX': 'Lazer',
  'SPOTIFY': 'Lazer',
  'AMAZON': 'Shopping',
  'MERCADO LIVRE': 'Shopping',
  'MAGAZINE LUIZA': 'Shopping',
  'POSTO': 'Transporte',
  'SHELL': 'Transporte',
  'IPIRANGA': 'Transporte',
  'DROGASIL': 'Saúde',
  'PAG*': 'Outros',
  'PIX': 'Transferência',
};

export function matchCategoryByDescription(description: string, categories: Category[]): string {
  const normalizedDesc = description.toUpperCase();
  
  for (const [pattern, categoryName] of Object.entries(MERCHANT_MAP)) {
    if (normalizedDesc.includes(pattern)) {
      const category = categories.find(c => c.name === categoryName);
      if (category) return category.id;
    }
  }
  
  // Default to 'Outros' if not found
  const outros = categories.find(c => c.name === 'Outros');
  return outros ? outros.id : (categories[0]?.id || '');
}

export function detectInstallments(description: string): { current: number, total: number } | null {
  // Patterns like "1/12", "02/10", "Parcela 3 de 8", "3-10", "03\10"
  const patterns = [
    /(\d+)\s*[\/\-\\]\s*(\d+)/, // 1/12, 1-12, 1\12
    /PARCELA\s*(\d+)\s*DE\s*(\d+)/i, // Parcela 1 de 12
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return {
        current: parseInt(match[1], 10),
        total: parseInt(match[2], 10)
      };
    }
  }

  return null;
}
