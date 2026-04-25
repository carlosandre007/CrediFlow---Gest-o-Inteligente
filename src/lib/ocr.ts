import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';

// ============================================================
// CONFIGURAÇÃO DO WORKER (Vite + pdfjs-dist v5)
// ============================================================
// Importa o worker como URL local via Vite — sem depender de CDN externo.
// Isso resolve o erro 404 que ocorre quando o CDN não tem a versão .mjs correta.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

console.log(`[OCR] PDF.js v${pdfjsLib.version} inicializado.`);
console.log(`[OCR] Worker carregado de: ${pdfjsWorkerUrl}`);

// ============================================================
// ETAPA 1: Extração de texto de PDF digital (via PDF.js)
// ============================================================
export async function extractTextFromPDF(file: File): Promise<string> {
  console.log(`[OCR][PDF.js] Iniciando extração de PDF digital...`);

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  console.log(`[OCR][PDF.js] PDF carregado com ${pdf.numPages} página(s).`);

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    const pageText = strings.join(' ');
    fullText += pageText + '\n';
    console.log(`[OCR][PDF.js] Página ${i}: ${pageText.length} caracteres extraídos.`);
  }

  const trimmed = fullText.trim();
  console.log(`[OCR][PDF.js] Total extraído: ${trimmed.length} caracteres.`);
  if (trimmed.length > 0) {
    console.log(`[OCR][PDF.js] Preview: "${trimmed.substring(0, 300).replace(/\n/g, ' ')}"`);
  }

  return fullText;
}

// ============================================================
// ETAPA 2: Renderizar página de PDF em imagem (Canvas)
// Usado quando o PDF é escaneado (imagem) e não tem texto digital.
// ============================================================
async function renderPDFPageToImageBlob(file: File, pageNum: number): Promise<Blob> {
  console.log(`[OCR][Canvas] Renderizando página ${pageNum} do PDF como imagem...`);

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNum);

  // Escala 2x para melhor qualidade de OCR
  const scale = 2.0;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('[OCR] Erro interno: não foi possível criar contexto Canvas 2D.');
  }

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  } as any).promise;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          console.log(`[OCR][Canvas] Imagem gerada: ${(blob.size / 1024).toFixed(1)} KB (${canvas.width}x${canvas.height})`);
          resolve(blob);
        } else {
          reject(new Error('[OCR] Falha ao converter Canvas para Blob de imagem.'));
        }
      },
      'image/png'
    );
  });
}

// ============================================================
// ETAPA 3: OCR via Tesseract.js (recebe IMAGEM, nunca PDF)
// ============================================================
export async function extractTextFromImage(imageInput: File | Blob): Promise<string> {
  console.log(`[OCR][Tesseract] Iniciando OCR...`);
  console.log(`[OCR][Tesseract] Input: ${imageInput instanceof File ? imageInput.name : 'Blob'} (${(imageInput.size / 1024).toFixed(1)} KB)`);

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let imageUrl = '';

  try {
    worker = await createWorker('por'); // Português
    imageUrl = URL.createObjectURL(imageInput);

    const { data: { text } } = await worker.recognize(imageUrl);

    console.log(`[OCR][Tesseract] Texto reconhecido: ${text.trim().length} caracteres.`);
    if (text.trim().length > 0) {
      console.log(`[OCR][Tesseract] Preview: "${text.substring(0, 300).replace(/\n/g, ' ')}"`);
    }

    return text;
  } catch (error: any) {
    console.error(`[OCR][Tesseract] Erro no OCR:`, error);
    throw new Error(`Erro no OCR: ${error.message || 'Falha ao reconhecer texto.'}`);
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch (_) { /* ignore cleanup errors */ }
    }
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  }
}

// ============================================================
// ETAPA 4: OCR de PDF escaneado (PDF → Canvas → Imagem → Tesseract)
// ============================================================
async function ocrScannedPDF(file: File): Promise<string> {
  console.log(`[OCR][ScannedPDF] Iniciando conversão PDF → Imagem → OCR...`);

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  console.log(`[OCR][ScannedPDF] Total de páginas: ${pdf.numPages}`);

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      console.log(`[OCR][ScannedPDF] Processando página ${i}/${pdf.numPages}...`);
      
      // 1. Renderiza a página do PDF como imagem PNG
      const imageBlob = await renderPDFPageToImageBlob(file, i);
      
      // 2. Passa a IMAGEM (não o PDF) para o Tesseract
      const pageText = await extractTextFromImage(imageBlob);
      fullText += pageText + '\n';
      
      console.log(`[OCR][ScannedPDF] Página ${i}: ${pageText.trim().length} caracteres via OCR.`);
    } catch (err: any) {
      console.warn(`[OCR][ScannedPDF] Falha na página ${i}: ${err.message}`);
      // Continua para a próxima página
    }
  }

  const trimmed = fullText.trim();
  console.log(`[OCR][ScannedPDF] Total final: ${trimmed.length} caracteres de ${pdf.numPages} página(s).`);

  return fullText;
}

// ============================================================
// TIPOS DE ERRO ESPECÍFICOS POR ETAPA
// ============================================================
export type ExtractionStage = 'upload' | 'pdf_read' | 'ocr' | 'empty_text';

export class ExtractionError extends Error {
  stage: ExtractionStage;

  constructor(message: string, stage: ExtractionStage) {
    super(message);
    this.name = 'ExtractionError';
    this.stage = stage;
  }
}

// ============================================================
// PIPELINE PRINCIPAL: Extração inteligente com fallbacks
//
// Fluxo:
//   1. Se é PDF → tenta PDF.js (texto digital)
//   2. Se texto vazio → converte PDF em imagem → OCR (Tesseract)
//   3. Se é imagem → OCR direto (Tesseract)
//   4. Se tudo falhar → erro claro para o usuário
// ============================================================
export async function extractTextFromFile(file: File): Promise<string> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[OCR] PIPELINE INICIADO`);
  console.log(`[OCR] Arquivo: ${file.name}`);
  console.log(`[OCR] Tipo MIME: ${file.type}`);
  console.log(`[OCR] Tamanho: ${(file.size / 1024).toFixed(1)} KB`);
  console.log(`${'='.repeat(60)}`);

  // Validação inicial
  if (!file || file.size === 0) {
    throw new ExtractionError(
      'O arquivo está vazio ou corrompido. Selecione outro arquivo.',
      'upload'
    );
  }

  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/');

  if (!isPDF && !isImage) {
    throw new ExtractionError(
      `Formato não suportado: "${file.type || 'desconhecido'}". Use PDF, JPG ou PNG.`,
      'upload'
    );
  }

  // ────────────────────────────────────────────────────
  // FLUXO PDF
  // ────────────────────────────────────────────────────
  if (isPDF) {
    // TENTATIVA 1: Extrair texto digital embutido no PDF (rápido)
    try {
      console.log(`[OCR] TENTATIVA 1: Texto digital via PDF.js...`);
      const text = await extractTextFromPDF(file);

      if (text.trim().length > 50) {
        console.log(`[OCR] ✅ SUCESSO — PDF digital! (${text.trim().length} chars)`);
        return text;
      }

      console.log(`[OCR] ⚠️ PDF.js retornou apenas ${text.trim().length} chars. Provavelmente é um PDF escaneado.`);
    } catch (pdfError: any) {
      console.warn(`[OCR] ⚠️ PDF.js falhou: ${pdfError.message}`);
    }

    // TENTATIVA 2: OCR do PDF escaneado (renderiza → imagem → Tesseract)
    try {
      console.log(`[OCR] TENTATIVA 2: PDF escaneado → Canvas → Tesseract OCR...`);
      const text = await ocrScannedPDF(file);

      if (text.trim().length > 10) {
        console.log(`[OCR] ✅ SUCESSO — OCR de PDF escaneado! (${text.trim().length} chars)`);
        return text;
      }

      console.log(`[OCR] ❌ OCR retornou texto insuficiente (${text.trim().length} chars).`);
    } catch (ocrError: any) {
      console.error(`[OCR] ❌ OCR do PDF falhou:`, ocrError.message);
    }

    // Ambos falharam
    throw new ExtractionError(
      'Não foi possível ler o texto deste PDF. O arquivo pode estar protegido, corrompido ou ilegível. Tente tirar uma foto da fatura.',
      'pdf_read'
    );
  }

  // ────────────────────────────────────────────────────
  // FLUXO IMAGEM (JPG, PNG, etc.)
  // ────────────────────────────────────────────────────
  try {
    console.log(`[OCR] Processando imagem via Tesseract OCR...`);
    const text = await extractTextFromImage(file);

    if (!text || text.trim().length < 10) {
      throw new ExtractionError(
        'O OCR não conseguiu ler texto nesta imagem. Tente uma foto mais nítida, com boa iluminação e sem reflexos.',
        'ocr'
      );
    }

    console.log(`[OCR] ✅ SUCESSO — Imagem processada! (${text.trim().length} chars)`);
    return text;
  } catch (error: any) {
    if (error instanceof ExtractionError) throw error;

    console.error(`[OCR] ❌ Erro inesperado no OCR:`, error);
    throw new ExtractionError(
      `Erro ao processar a imagem: ${error.message || 'Erro desconhecido no OCR.'}`,
      'ocr'
    );
  }
}
