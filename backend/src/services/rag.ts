import { DocumentChunk, VectorDocument } from '../types';
import { v4 as uuidv4 } from 'uuid';

// In-memory vector store using TF-IDF for similarity
// Swap this for Pinecone/Chroma/Weaviate in production
const documentStore: Map<string, VectorDocument> = new Map();

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function computeTFIDF(query: string, chunk: string): number {
  const queryTokens = new Set(tokenize(query));
  const chunkTokens = tokenize(chunk);
  const chunkTokenSet = new Set(chunkTokens);

  if (queryTokens.size === 0 || chunkTokens.length === 0) return 0;

  let score = 0;
  queryTokens.forEach((token) => {
    if (chunkTokenSet.has(token)) {
      const tf = chunkTokens.filter((t) => t === token).length / chunkTokens.length;
      score += tf;
    }
  });

  // Boost score for exact phrase matches
  const queryLower = query.toLowerCase();
  const chunkLower = chunk.toLowerCase();
  if (chunkLower.includes(queryLower)) {
    score += 0.5;
  }

  return score;
}

function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }
  }

  return chunks;
}

export async function addDocument(name: string, content: string): Promise<string> {
  const docId = uuidv4();
  const textChunks = chunkText(content);

  const docChunks: DocumentChunk[] = textChunks.map((chunkContent, index) => ({
    id: uuidv4(),
    documentId: docId,
    documentName: name,
    content: chunkContent,
    index,
  }));

  const doc: VectorDocument = {
    id: docId,
    name,
    chunks: docChunks,
    uploadedAt: new Date().toISOString(),
  };

  documentStore.set(docId, doc);
  console.log(`Document "${name}" stored with ${docChunks.length} chunks`);
  return docId;
}

export async function searchDocuments(
  query: string,
  topK = 3
): Promise<DocumentChunk[]> {
  const allChunks: DocumentChunk[] = [];

  documentStore.forEach((doc) => {
    doc.chunks.forEach((chunk) => {
      allChunks.push(chunk);
    });
  });

  if (allChunks.length === 0) {
    return [];
  }

  const scored = allChunks.map((chunk) => ({
    ...chunk,
    score: computeTFIDF(query, chunk.content),
  }));

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return scored.slice(0, topK).filter((c) => (c.score ?? 0) > 0);
}

export function getDocumentList(): { id: string; name: string; uploadedAt: string; chunkCount: number }[] {
  const docs: { id: string; name: string; uploadedAt: string; chunkCount: number }[] = [];
  documentStore.forEach((doc) => {
    docs.push({
      id: doc.id,
      name: doc.name,
      uploadedAt: doc.uploadedAt,
      chunkCount: doc.chunks.length,
    });
  });
  return docs;
}

export function hasDocuments(): boolean {
  return documentStore.size > 0;
}
