/**
 * Gemini API Key Manager - Round Robin
 * 
 * Rotates through multiple API keys to avoid rate limiting
 * during testing with free tier keys.
 */

import { logger } from "@/lib/logger";

class GeminiKeyManager {
  private keys: string[] = [];
  private currentIndex: number = 0;
  private lastUsed: Map<string, number> = new Map();
  private cooldownMs: number = 1000; // 1 second cooldown between same key usage

  constructor() {
    this.loadKeys();
  }

  private loadKeys(): void {
    // Load keys from environment variables
    // Support GEMINI_API_KEY, GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
    const keys: string[] = [];

    // Primary key
    if (process.env.GEMINI_API_KEY) {
      keys.push(process.env.GEMINI_API_KEY);
    }

    // Additional keys (1-10)
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) {
        keys.push(key);
      }
    }

    // Deduplicate keys
    this.keys = [...new Set(keys)];

    if (this.keys.length === 0) {
      logger.warn("GeminiKeyManager", "No Gemini API keys found in environment");
    } else {
      logger.info("GeminiKeyManager", `Loaded ${this.keys.length} Gemini API key(s) for round-robin rotation`);
    }
  }

  /**
   * Get the next available API key using round-robin
   */
  getNextKey(): string {
    if (this.keys.length === 0) {
      throw new Error("No Gemini API keys configured. Set GEMINI_API_KEY in your environment.");
    }

    // If only one key, just return it
    if (this.keys.length === 1) {
      return this.keys[0];
    }

    // Find a key that's not in cooldown
    const now = Date.now();
    let attempts = 0;

    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex];
      const lastUsedTime = this.lastUsed.get(key) || 0;

      // Move to next index for round-robin
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;

      // Check if key is out of cooldown
      if (now - lastUsedTime >= this.cooldownMs) {
        this.lastUsed.set(key, now);
        logger.debug("GeminiKeyManager", `Using API key index ${(this.currentIndex - 1 + this.keys.length) % this.keys.length}`);
        return key;
      }

      attempts++;
    }

    // All keys in cooldown, use the next one anyway
    const key = this.keys[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    this.lastUsed.set(key, now);
    return key;
  }

  /**
   * Mark a key as having an error (rate limited)
   * Increases its cooldown temporarily
   */
  markKeyError(key: string): void {
    // Set a longer cooldown for this key (60 seconds)
    this.lastUsed.set(key, Date.now() + 59000);
    logger.warn("GeminiKeyManager", "API key marked as rate-limited, cooling down for 60s");
  }

  /**
   * Get the number of available keys
   */
  getKeyCount(): number {
    return this.keys.length;
  }

  /**
   * Reload keys from environment (useful for testing)
   */
  reloadKeys(): void {
    this.loadKeys();
  }
}

// Singleton instance
export const geminiKeyManager = new GeminiKeyManager();
