import { createClient } from "@upstash/redis"
import { env } from "@/lib/env"

// Create a singleton Redis client
let redisClient: ReturnType<typeof createClient> | null = null

export function getRedisClient() {
  if (!redisClient) {
    // Check if we have the required environment variables
    if (!env.REDIS_URL && !env.KV_URL) {
      throw new Error("Redis URL not found in environment variables")
    }

    // Create the Redis client
    redisClient = createClient({
      url: env.REDIS_URL || env.KV_URL || "",
      token: env.KV_REST_API_TOKEN || "",
    })
  }

  return redisClient
}

// Helper function to safely get data from Redis with error handling
export async function getFromRedis<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    return (await client.get(key)) as T
  } catch (error) {
    console.error("Error getting data from Redis:", error)
    return null
  }
}

// Helper function to safely set data in Redis with error handling
export async function setInRedis(key: string, value: any, expirationInSeconds?: number): Promise<boolean> {
  try {
    const client = getRedisClient()
    if (expirationInSeconds) {
      await client.set(key, value, { ex: expirationInSeconds })
    } else {
      await client.set(key, value)
    }
    return true
  } catch (error) {
    console.error("Error setting data in Redis:", error)
    return false
  }
}

// Helper function to delete data from Redis
export async function deleteFromRedis(key: string): Promise<boolean> {
  try {
    const client = getRedisClient()
    await client.del(key)
    return true
  } catch (error) {
    console.error("Error deleting data from Redis:", error)
    return false
  }
}

// Helper function to check if a key exists in Redis
export async function existsInRedis(key: string): Promise<boolean> {
  try {
    const client = getRedisClient()
    return (await client.exists(key)) === 1
  } catch (error) {
    console.error("Error checking if key exists in Redis:", error)
    return false
  }
}
