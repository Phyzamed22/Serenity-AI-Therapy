import type { Pipeline } from "@xenova/transformers"
import type { KnowledgeEntry } from "./knowledge-base"

// Interface for vector search results
export interface SearchResult {
  entry: KnowledgeEntry
  score: number
}

export class VectorStore {
  private embeddings: number[][] = []
  private entries: KnowledgeEntry[] = []
  private pipeline: Pipeline | null = null
  private isInitialized = false

  /**
   * Initialize the vector store with knowledge entries
   */
  async initialize(entries: KnowledgeEntry[]): Promise<void> {
    if (this.isInitialized) return

    try {
      // Load the embedding pipeline
      const { pipeline } = await import("@xenova/transformers")
      this.pipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")

      // Store the entries
      this.entries = entries

      // Generate embeddings for all entries
      console.log("Generating embeddings for knowledge base...")
      this.embeddings = await this.generateEmbeddings(entries.map((e) => e.content))

      this.isInitialized = true
      console.log(`✅ Vector store initialized with ${entries.length} entries`)
    } catch (error) {
      console.error("Error initializing vector store:", error)
      throw new Error("Failed to initialize vector store")
    }
  }

  /**
   * Generate embeddings for a list of texts
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.pipeline) {
      throw new Error("Pipeline not initialized")
    }

    const embeddings: number[][] = []

    // Process in batches to avoid memory issues
    const batchSize = 16
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const results = await Promise.all(
        batch.map(async (text) => {
          const result = await this.pipeline!({
            inputs: text,
            pooling: "mean",
            normalize: true,
          })
          return Array.from(result.data)
        }),
      )
      embeddings.push(...results)
    }

    return embeddings
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same dimensions")
    }

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) {
      return 0
    }

    return dotProduct / (normA * normB)
  }

  /**
   * Search for similar entries based on a query
   */
  async search(query: string, topK = 5): Promise<SearchResult[]> {
    if (!this.isInitialized || !this.pipeline) {
      throw new Error("Vector store not initialized")
    }

    // Generate embedding for the query
    const queryEmbedding = (await this.generateEmbeddings([query]))[0]

    // Calculate similarity scores
    const scores = this.embeddings.map((embedding, index) => ({
      index,
      score: this.cosineSimilarity(queryEmbedding, embedding),
    }))

    // Sort by score in descending order and take top K
    const topResults = scores.sort((a, b) => b.score - a.score).slice(0, topK)

    // Map to search results
    return topResults.map((result) => ({
      entry: this.entries[result.index],
      score: result.score,
    }))
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null

export async function getVectorStore(entries?: KnowledgeEntry[]): Promise<VectorStore> {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore()

    if (entries) {
      await vectorStoreInstance.initialize(entries)
    }
  } else if (entries) {
    // Reinitialize with new entries if provided
    await vectorStoreInstance.initialize(entries)
  }

  return vectorStoreInstance
}
