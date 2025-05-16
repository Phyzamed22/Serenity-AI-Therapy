/**
 * Knowledge base service for the Serenity application
 * Manages therapeutic knowledge content and interfaces with the vector store
 */

import { type VectorStore, getVectorStore } from "./vector-store"

// Interface for knowledge entries
export interface KnowledgeEntry {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  source?: string
}

// Main knowledge base class
export class KnowledgeBase {
  private vectorStore: VectorStore

  constructor(vectorStore: VectorStore) {
    this.vectorStore = vectorStore
  }

  // Add a single entry to the knowledge base
  public async addEntry(entry: KnowledgeEntry): Promise<boolean> {
    try {
      await this.vectorStore.addDocument({
        id: entry.id,
        text: entry.content,
        metadata: {
          title: entry.title,
          category: entry.category,
          tags: entry.tags,
          source: entry.source || "internal",
        },
      })
      return true
    } catch (error) {
      console.error("Error adding entry to knowledge base:", error)
      return false
    }
  }

  // Add multiple entries to the knowledge base
  public async addEntries(entries: KnowledgeEntry[]): Promise<number> {
    let successCount = 0

    for (const entry of entries) {
      const success = await this.addEntry(entry)
      if (success) successCount++
    }

    return successCount
  }

  // Search the knowledge base for relevant content
  public async search(query: string, limit = 5): Promise<KnowledgeEntry[]> {
    try {
      const results = await this.vectorStore.search(query, limit)

      return results.map((result) => ({
        id: result.id,
        title: result.metadata?.title || "Untitled",
        content: result.text,
        category: result.metadata?.category || "general",
        tags: result.metadata?.tags || [],
        source: result.metadata?.source,
      }))
    } catch (error) {
      console.error("Error searching knowledge base:", error)
      return []
    }
  }

  // Check if the knowledge base is populated
  public async isPopulated(): Promise<boolean> {
    try {
      const count = await this.vectorStore.getDocumentCount()
      return count > 0
    } catch (error) {
      console.error("Error checking if knowledge base is populated:", error)
      return false
    }
  }

  // Clear the knowledge base
  public async clear(): Promise<boolean> {
    try {
      await this.vectorStore.clearAll()
      return true
    } catch (error) {
      console.error("Error clearing knowledge base:", error)
      return false
    }
  }
}

// Singleton instance
let instance: KnowledgeBase | null = null

// Getter function for the singleton instance
export function getKnowledgeBase(): KnowledgeBase {
  if (!instance) {
    const vectorStore = getVectorStore()
    instance = new KnowledgeBase(vectorStore)
  }
  return instance
}
