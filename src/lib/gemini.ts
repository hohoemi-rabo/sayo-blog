import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'gemini-embedding-001'

let genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY が設定されていません。.env.local に GEMINI_API_KEY を追加してください。'
    )
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  }
  return genAI
}

export function getGenerativeModel() {
  return getClient().getGenerativeModel({ model: GEMINI_MODEL })
}

export function getEmbeddingModel() {
  return getClient().getGenerativeModel({ model: EMBEDDING_MODEL })
}
