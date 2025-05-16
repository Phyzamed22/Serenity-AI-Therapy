/**
 * Vector store service for the Serenity application
 * Manages embeddings and vector search for the RAG system
 */

import { createClient } from "@/lib/supabase/server"

// Interface for document with metadata
export interface Document {
  id: string
  text: string
  metadata?: Record<string, any>
}

// Interface for search result
export interface SearchResult extends Document {
  similarity: number
}

// Main vector store class
export class VectorStore {
  private supabase: ReturnType<typeof createClient>

  constructor() {
    this.supabase = createClient()
  }

  // Add a document to the vector store
  public async addDocument(document: Document): Promise<boolean> {
    try {
      // Generate embedding using Supabase's pgvector
      const { data: embedding, error: embeddingError } = await this.supabase.rpc("generate_embedding", {
        input_text: document.text,
      })

      if (embeddingError) {
        throw new Error(`Error generating embedding: ${embeddingError.message}`)
      }

      // Insert document with embedding
      const { error: insertError } = await this.supabase.from("vector_store").insert({
        id: document.id,
        content: document.text,
        embedding,
        metadata: document.metadata || {},
      })

      if (insertError) {
        throw new Error(`Error inserting document: ${insertError.message}`)
      }

      return true
    } catch (error) {
      console.error("Error adding document to vector store:", error)
      return false
    }
  }

  // Search for similar documents
  public async search(query: string, limit = 5): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query
      const { data: embedding, error: embeddingError } = await this.supabase.rpc("generate_embedding", {
        input_text: query,
      })

      if (embeddingError) {
        throw new Error(`Error generating embedding: ${embeddingError.message}`)
      }

      // Search for similar documents
      const { data: results, error: searchError } = await this.supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: limit,
      })

      if (searchError) {
        throw new Error(`Error searching documents: ${searchError.message}`)
      }

      // Format results
      return (results || []).map((result) => ({
        id: result.id,
        text: result.content,
        metadata: result.metadata,
        similarity: result.similarity,
      }))
    } catch (error) {
      console.error("Error searching vector store:", error)
      return []
    }
  }

  // Get the count of documents in the vector store
  public async getDocumentCount(): Promise<number> {
    try {
      const { count, error } = await this.supabase.from("vector_store").select("*", { count: "exact", head: true })

      if (error) {
        throw new Error(`Error getting document count: ${error.message}`)
      }

      return count || 0
    } catch (error) {
      console.error("Error getting document count:", error)
      return 0
    }
  }

  // Clear all documents from the vector store
  public async clearAll(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from("vector_store").delete().neq("id", "placeholder") // Delete all rows

      if (error) {
        throw new Error(`Error clearing vector store: ${error.message}`)
      }

      return true
    } catch (error) {
      console.error("Error clearing vector store:", error)
      return false
    }
  }
}

// Singleton instance
let instance: VectorStore | null = null

// Getter function for the singleton instance
export function getVectorStore(): VectorStore {
  if (!instance) {
    instance = new VectorStore()
  }
  return instance
}
