import fs from "fs"
import path from "path"
import { createClientSupabaseClient } from "@/lib/supabase/client"

export interface KnowledgeEntry {
  id: string
  content: string
  category: string
  tags: string[]
  source?: string
}

let knowledgeBase: KnowledgeEntry[] | null = null

/**
 * Loads the therapy knowledge base from a JSON file
 */
export async function loadKnowledgeBase(filePath?: string): Promise<KnowledgeEntry[]> {
  // Return cached knowledge base if already loaded
  if (knowledgeBase) {
    return knowledgeBase
  }

  try {
    // Default path if not provided
    const actualPath = filePath || path.join(process.cwd(), "data", "therapy-knowledge.json")

    // Read and parse the JSON file
    const fileContent = await fs.promises.readFile(actualPath, "utf-8")
    knowledgeBase = JSON.parse(fileContent) as KnowledgeEntry[]

    console.log(`✅ Loaded ${knowledgeBase.length} therapy knowledge entries`)
    return knowledgeBase
  } catch (error) {
    console.error("Error loading knowledge base:", error)
    // Return empty array as fallback
    return []
  }
}

/**
 * Filters knowledge base entries by category and tags
 */
export function filterKnowledgeBase(
  entries: KnowledgeEntry[],
  categories?: string[],
  tags?: string[],
): KnowledgeEntry[] {
  return entries.filter((entry) => {
    // Filter by category if specified
    if (categories && categories.length > 0) {
      if (!categories.includes(entry.category)) {
        return false
      }
    }

    // Filter by tags if specified
    if (tags && tags.length > 0) {
      // Check if entry has at least one of the specified tags
      if (!entry.tags.some((tag) => tags.includes(tag))) {
        return false
      }
    }

    return true
  })
}

export class KnowledgeBase {
  private supabase = createClientSupabaseClient()

  // Rest of the file...
}
