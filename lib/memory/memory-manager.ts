import { createClientSupabaseClient } from "@/lib/supabase/client"
import { getRedisClient, getFromRedis, setInRedis } from "@/lib/redis/client"
import { TherapistRAG } from "@/lib/rag/therapist-rag"

// Define types for our memory system
export interface UserMemory {
  id?: string
  user_id: string
  key: string
  value: any
  context?: string
  created_at?: string
  updated_at?: string
  importance: number
  access_count: number
  last_accessed?: string
}

export interface SessionMemory {
  session_id: string
  key: string
  value: any
  created_at?: string
}

export interface MemorySearchResult {
  memories: UserMemory[]
  totalCount: number
}

export class MemoryManager {
  private supabase = createClientSupabaseClient()
  private rag = new TherapistRAG()

  // Cache TTLs in seconds
  private readonly SHORT_TERM_TTL = 60 * 5 // 5 minutes
  private readonly MEDIUM_TERM_TTL = 60 * 60 * 24 // 1 day
  private readonly LONG_TERM_TTL = 60 * 60 * 24 * 7 // 1 week

  constructor() {
    // Initialize the RAG system
    this.rag.initialize().catch((error) => {
      console.error("Error initializing RAG system:", error)
    })
  }

  // Generate Redis keys
  private getUserMemoryKey(userId: string, key: string): string {
    return `user:${userId}:memory:${key}`
  }

  private getSessionMemoryKey(sessionId: string, key: string): string {
    return `session:${sessionId}:memory:${key}`
  }

  private getResponseCacheKey(input: string, userId: string): string {
    // Create a deterministic hash of the input for caching
    const inputHash = this.hashString(input)
    return `response:${userId}:${inputHash}`
  }

  // Simple string hashing function
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(16)
  }

  // Store a memory in both Redis (cache) and Supabase (persistent)
  async storeUserMemory(memory: UserMemory): Promise<UserMemory | null> {
    try {
      // Store in Redis cache first
      const redisKey = this.getUserMemoryKey(memory.user_id, memory.key)
      await setInRedis(redisKey, memory.value, this.MEDIUM_TERM_TTL)

      // Then store in Supabase for persistence
      const { data, error } = await this.supabase
        .from("user_memories")
        .upsert(
          {
            user_id: memory.user_id,
            key: memory.key,
            value: memory.value,
            context: memory.context || null,
            importance: memory.importance || 1,
            access_count: memory.access_count || 0,
            last_accessed: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id, key",
          },
        )
        .select()

      if (error) {
        console.error("Error storing user memory in Supabase:", error)
        return null
      }

      return data[0] as UserMemory
    } catch (error) {
      console.error("Error storing user memory:", error)
      return null
    }
  }

  // Retrieve a memory, trying Redis first then falling back to Supabase
  async getUserMemory(userId: string, key: string): Promise<UserMemory | null> {
    try {
      // Try Redis cache first
      const redisKey = this.getUserMemoryKey(userId, key)
      const cachedValue = await getFromRedis<any>(redisKey)

      if (cachedValue) {
        // Update access count in Supabase asynchronously
        this.updateMemoryAccessCount(userId, key).catch(console.error)

        return {
          user_id: userId,
          key,
          value: cachedValue,
          importance: 1,
          access_count: 1,
        }
      }

      // If not in cache, get from Supabase
      const { data, error } = await this.supabase
        .from("user_memories")
        .select("*")
        .eq("user_id", userId)
        .eq("key", key)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // Not found
          return null
        }
        console.error("Error retrieving user memory from Supabase:", error)
        return null
      }

      // Update the cache with the retrieved value
      await setInRedis(redisKey, data.value, this.MEDIUM_TERM_TTL)

      // Update access count
      await this.updateMemoryAccessCount(userId, key)

      return data as UserMemory
    } catch (error) {
      console.error("Error retrieving user memory:", error)
      return null
    }
  }

  // Update the access count for a memory
  private async updateMemoryAccessCount(userId: string, key: string): Promise<void> {
    try {
      await this.supabase.rpc("increment_memory_access_count", {
        p_user_id: userId,
        p_key: key,
        p_timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error updating memory access count:", error)
    }
  }

  // Store session-specific memory (shorter-lived)
  async storeSessionMemory(sessionId: string, key: string, value: any): Promise<boolean> {
    try {
      // Store in Redis cache
      const redisKey = this.getSessionMemoryKey(sessionId, key)
      await setInRedis(redisKey, value, this.SHORT_TERM_TTL)

      // Also store in Supabase for session history
      const { error } = await this.supabase.from("session_memories").upsert(
        {
          session_id: sessionId,
          key,
          value,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "session_id, key",
        },
      )

      if (error) {
        console.error("Error storing session memory in Supabase:", error)
      }

      return true
    } catch (error) {
      console.error("Error storing session memory:", error)
      return false
    }
  }

  // Get session memory
  async getSessionMemory(sessionId: string, key: string): Promise<any | null> {
    try {
      // Try Redis cache first
      const redisKey = this.getSessionMemoryKey(sessionId, key)
      const cachedValue = await getFromRedis<any>(redisKey)

      if (cachedValue) {
        return cachedValue
      }

      // If not in cache, get from Supabase
      const { data, error } = await this.supabase
        .from("session_memories")
        .select("value")
        .eq("session_id", sessionId)
        .eq("key", key)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // Not found
          return null
        }
        console.error("Error retrieving session memory from Supabase:", error)
        return null
      }

      // Update the cache with the retrieved value
      await setInRedis(redisKey, data.value, this.SHORT_TERM_TTL)

      return data.value
    } catch (error) {
      console.error("Error retrieving session memory:", error)
      return null
    }
  }

  // Cache AI responses to reduce latency for similar questions
  async cacheResponse(input: string, response: string, userId: string): Promise<boolean> {
    try {
      const cacheKey = this.getResponseCacheKey(input, userId)
      return await setInRedis(cacheKey, response, this.SHORT_TERM_TTL)
    } catch (error) {
      console.error("Error caching response:", error)
      return false
    }
  }

  // Get cached response if available
  async getCachedResponse(input: string, userId: string): Promise<string | null> {
    try {
      const cacheKey = this.getResponseCacheKey(input, userId)
      return await getFromRedis<string>(cacheKey)
    } catch (error) {
      console.error("Error getting cached response:", error)
      return null
    }
  }

  // Search for memories based on semantic similarity using RAG
  async searchMemories(userId: string, query: string, limit = 5): Promise<MemorySearchResult> {
    try {
      // First try to get from Redis cache
      const cacheKey = `memory_search:${userId}:${this.hashString(query)}`
      const cachedResults = await getFromRedis<MemorySearchResult>(cacheKey)

      if (cachedResults) {
        return cachedResults
      }

      // If not cached, perform the search using RAG
      const { data, error } = await this.supabase
        .from("user_memories")
        .select("*")
        .eq("user_id", userId)
        .order("importance", { ascending: false })
        .order("access_count", { ascending: false })
        .limit(50) // Get more than we need for filtering

      if (error) {
        console.error("Error searching memories in Supabase:", error)
        return { memories: [], totalCount: 0 }
      }

      // Use RAG to find semantically similar memories
      const memories = data as UserMemory[]
      const totalCount = memories.length

      if (memories.length === 0) {
        return { memories: [], totalCount: 0 }
      }

      // Convert memories to text for semantic search
      const memoryTexts = memories.map(
        (memory) => `Memory: ${memory.key}\nValue: ${JSON.stringify(memory.value)}\nContext: ${memory.context || ""}`,
      )

      // Use RAG to find the most relevant memories
      const relevantIndices = await this.rag.findSimilarTexts(query, memoryTexts, limit)
      const relevantMemories = relevantIndices.map((index) => memories[index])

      // Cache the results
      const result = {
        memories: relevantMemories,
        totalCount,
      }
      await setInRedis(cacheKey, result, this.SHORT_TERM_TTL)

      return result
    } catch (error) {
      console.error("Error searching memories:", error)
      return { memories: [], totalCount: 0 }
    }
  }

  // Extract and store important information from a conversation
  async extractAndStoreMemories(userId: string, conversation: Array<{ role: string; content: string }>): Promise<void> {
    try {
      // Use RAG to extract important information
      const userMessages = conversation
        .filter((msg) => msg.role === "user")
        .map((msg) => msg.content)
        .join("\n")

      // Skip if there's not enough user content
      if (userMessages.length < 20) {
        return
      }

      // Extract key information using RAG
      const extractionPrompt = `
        Extract key information about the user from this conversation:
        ${userMessages}
        
        Format the output as JSON with the following structure:
        {
          "memories": [
            {
              "key": "memory_key",
              "value": "memory_value",
              "importance": 1-5,
              "context": "where this information came from"
            }
          ]
        }
      `

      const extractionResult = await this.rag.getResponse(extractionPrompt, {
        userId,
        extractMemories: true,
      })

      // Parse the extraction result
      try {
        const extractedData = JSON.parse(extractionResult)

        if (extractedData.memories && Array.isArray(extractedData.memories)) {
          // Store each extracted memory
          for (const memory of extractedData.memories) {
            await this.storeUserMemory({
              user_id: userId,
              key: memory.key,
              value: memory.value,
              context: memory.context || "Extracted from conversation",
              importance: memory.importance || 1,
              access_count: 0,
            })
          }
        }
      } catch (error) {
        console.error("Error parsing memory extraction result:", error)
      }
    } catch (error) {
      console.error("Error extracting and storing memories:", error)
    }
  }

  // Get relevant memories for a conversation
  async getRelevantMemories(userId: string, currentMessage: string): Promise<UserMemory[]> {
    try {
      // Search for relevant memories
      const { memories } = await this.searchMemories(userId, currentMessage, 5)
      return memories
    } catch (error) {
      console.error("Error getting relevant memories:", error)
      return []
    }
  }

  // Delete a specific memory
  async deleteMemory(userId: string, key: string): Promise<boolean> {
    try {
      // Delete from Supabase
      const { error } = await this.supabase.from("user_memories").delete().eq("user_id", userId).eq("key", key)

      if (error) {
        console.error("Error deleting memory from Supabase:", error)
        return false
      }

      // Delete from Redis cache
      const redisKey = this.getUserMemoryKey(userId, key)
      await getRedisClient().del(redisKey)

      return true
    } catch (error) {
      console.error("Error deleting memory:", error)
      return false
    }
  }
}

// Create a singleton instance
let memoryManagerInstance: MemoryManager | null = null

export function getMemoryManager(): MemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager()
  }
  return memoryManagerInstance
}
