/**
 * Logger Service
 *
 * Comprehensive logging system with automatic file rotation and cleanup
 * - In development: Logs to files in logs/ directory
 * - In production (Vercel/serverless): Logs to console only (read-only filesystem)
 */

import { writeFile, mkdir, readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  data?: unknown;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Check if we're in a serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = (): boolean => {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.VERCEL_ENV
  );
};

class Logger {
  private logDir: string;
  private currentLogFile: string;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly LOG_RETENTION_HOURS = 72;
  private readonly canWriteFiles: boolean;

  constructor() {
    this.logDir = join(process.cwd(), "logs");
    this.currentLogFile = this.getLogFileName();
    
    // Only enable file logging in non-serverless environments
    this.canWriteFiles = !isServerless() && process.env.NODE_ENV !== "production";
    
    if (this.canWriteFiles) {
      this.initFileLogging();
    }
  }

  /**
   * Initialize file logging (only in development)
   */
  private async initFileLogging(): Promise<void> {
    try {
      await this.ensureLogDirectory();
      this.startAutoCleanup();
    } catch (error) {
      console.warn("[Logger] File logging disabled:", error);
    }
  }

  /**
   * Get log file name based on current date
   */
  private getLogFileName(): string {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    return join(this.logDir, `app-${dateStr}.log`);
  }

  /**
   * Ensure logs directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    if (!this.canWriteFiles) return;
    
    try {
      if (!existsSync(this.logDir)) {
        await mkdir(this.logDir, { recursive: true });
      }
    } catch (error) {
      // Silently fail - we'll use console logging instead
    }
  }

  /**
   * Format log entry as JSON line
   */
  private formatLogEntry(
    level: LogLevel,
    service: string,
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any,
    error?: Error
  ): string {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
    };

    if (data !== undefined) {
      entry.data = this.sanitizeData(data);
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return JSON.stringify(entry) + "\n";
  }

  /**
   * Sanitize data to prevent circular references and large objects
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (
      typeof data === "string" ||
      typeof data === "number" ||
      typeof data === "boolean"
    ) {
      return data;
    }

    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack,
      };
    }

    if (Array.isArray(data)) {
      return data.slice(0, 100).map((item) => this.sanitizeData(item)); // Limit array size
    }

    if (typeof data === "object" && data !== null) {
      const sanitized: Record<string, unknown> = {};
      const keys = Object.keys(data).slice(0, 50); // Limit object keys
      for (const key of keys) {
        try {
          const value = (data as Record<string, unknown>)[key];
          if (typeof value === "string" && value.length > 1000) {
            sanitized[key] = value.substring(0, 1000) + "... [truncated]";
          } else {
            sanitized[key] = this.sanitizeData(value);
          }
        } catch {
          sanitized[key] = "[Unable to serialize]";
        }
      }
      return sanitized;
    }

    return String(data);
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(
    level: LogLevel,
    service: string,
    message: string,
    data?: unknown,
    error?: Error
  ): void {
    const timestamp = new Date().toISOString();
    const consoleMessage = `[${timestamp}] [${level}] [${service}] ${message}`;
    
    switch (level) {
      case LogLevel.ERROR:
        if (error) {
          console.error(consoleMessage, data || "", error);
        } else {
          console.error(consoleMessage, data || "");
        }
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage, data || "");
        break;
      case LogLevel.DEBUG:
        // Only log debug in development
        if (process.env.NODE_ENV === "development") {
          console.debug(consoleMessage, data || "");
        }
        break;
      default:
        console.log(consoleMessage, data || "");
    }
  }

  /**
   * Write log entry to file (only in development)
   */
  private async writeLog(
    level: LogLevel,
    service: string,
    message: string,
    data?: unknown,
    error?: Error
  ): Promise<void> {
    // Always log to console
    this.logToConsole(level, service, message, data, error);

    // Only write to file if enabled
    if (!this.canWriteFiles) {
      return;
    }

    try {
      await this.ensureLogDirectory();

      // Check if we need a new log file (new day)
      const newLogFile = this.getLogFileName();
      if (newLogFile !== this.currentLogFile) {
        this.currentLogFile = newLogFile;
      }

      const logLine = this.formatLogEntry(level, service, message, data, error);
      await writeFile(this.currentLogFile, logLine, { flag: "a" });
    } catch (writeError) {
      // Silently fail - console logging is already done
    }
  }

  /**
   * Clean up old log files (older than 72 hours)
   */
  private async cleanupOldLogs(): Promise<void> {
    if (!this.canWriteFiles) return;

    try {
      if (!existsSync(this.logDir)) {
        return;
      }

      const files = await readdir(this.logDir);
      const now = Date.now();
      const maxAge = this.LOG_RETENTION_HOURS * 60 * 60 * 1000; // 72 hours in milliseconds

      for (const file of files) {
        if (!file.endsWith(".log")) continue;

        const filePath = join(this.logDir, file);
        const stats = await stat(filePath);
        const fileAge = now - stats.mtime.getTime();

        if (fileAge > maxAge) {
          await unlink(filePath);
          console.log(
            `[Logger] Deleted old log file: ${file} (${Math.round(
              fileAge / (60 * 60 * 1000)
            )} hours old)`
          );
        }
      }
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Start automatic cleanup (runs every 6 hours)
   */
  private startAutoCleanup(): void {
    if (!this.canWriteFiles) return;

    // Run cleanup immediately
    this.cleanupOldLogs();

    // Then run every 6 hours
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  /**
   * Stop auto cleanup (useful for testing or shutdown)
   */
  public stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Log debug message
   */
  public debug(service: string, message: string, data?: unknown): void {
    this.writeLog(LogLevel.DEBUG, service, message, data).catch(() => {});
  }

  /**
   * Log info message
   */
  public info(service: string, message: string, data?: unknown): void {
    this.writeLog(LogLevel.INFO, service, message, data).catch(() => {});
  }

  /**
   * Log warning message
   */
  public warn(service: string, message: string, data?: unknown): void {
    this.writeLog(LogLevel.WARN, service, message, data).catch(() => {});
  }

  /**
   * Log error message
   */
  public error(
    service: string,
    message: string,
    error?: Error,
    data?: unknown
  ): void {
    this.writeLog(LogLevel.ERROR, service, message, data, error).catch(() => {});
  }

  /**
   * Log material upload event
   */
  public logMaterialUpload(
    materialId: string,
    title: string,
    courseId: string,
    userId: string
  ): void {
    this.info("MaterialService", "Material uploaded", {
      materialId,
      title,
      courseId,
      userId,
      action: "UPLOAD",
    });
  }

  /**
   * Log PDF parsing event
   */
  public logPDFParsing(
    materialId: string,
    status: string,
    error?: string,
    pageCount?: number
  ): void {
    this.info("PDFParser", "PDF parsing status", {
      materialId,
      status,
      error,
      pageCount,
      action: "PARSE",
    });
  }

  /**
   * Log embedding progress
   */
  public logEmbeddingProgress(
    materialId: string,
    currentChunk: number,
    totalChunks: number,
    chunkTitle?: string
  ): void {
    const progress =
      totalChunks > 0 ? Math.round((currentChunk / totalChunks) * 100) : 0;
    this.info("EmbeddingService", "Embedding progress", {
      materialId,
      currentChunk,
      totalChunks,
      progress: `${progress}%`,
      chunkTitle,
      action: "EMBED_PROGRESS",
    });
  }

  /**
   * Log embedding completion
   */
  public logEmbeddingComplete(
    materialId: string,
    totalChunks: number,
    duration?: number
  ): void {
    this.info("EmbeddingService", "Embedding completed", {
      materialId,
      totalChunks,
      duration: duration ? `${duration}ms` : undefined,
      action: "EMBED_COMPLETE",
    });
  }

  /**
   * Log question generation
   */
  public logQuestionGeneration(
    materialId: string,
    courseId: string,
    questionCount: number,
    success: boolean,
    error?: string
  ): void {
    if (success) {
      this.info("QuestionGenerator", "Questions generated", {
        materialId,
        courseId,
        questionCount,
        action: "GENERATE_QUESTIONS",
      });
    } else {
      this.error("QuestionGenerator", "Question generation failed", undefined, {
        materialId,
        courseId,
        questionCount,
        error,
        action: "GENERATE_QUESTIONS_FAILED",
      });
    }
  }

  /**
   * Log chat interaction
   */
  public logChat(
    materialId: string,
    userId: string,
    role: "user" | "assistant",
    messageLength: number
  ): void {
    this.info("ChatService", "Chat message", {
      materialId,
      userId,
      role,
      messageLength,
      action: "CHAT",
    });
  }

  /**
   * Log API request
   */
  public logAPIRequest(
    method: string,
    path: string,
    statusCode: number,
    duration?: number,
    userId?: string
  ): void {
    this.info("API", "Request processed", {
      method,
      path,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      userId,
      action: "API_REQUEST",
    });
  }

  /**
   * Log database operation
   */
  public logDatabaseOperation(
    operation: string,
    table: string,
    success: boolean,
    duration?: number,
    error?: string
  ): void {
    if (success) {
      this.debug("Database", "Database operation", {
        operation,
        table,
        duration: duration ? `${duration}ms` : undefined,
        action: "DB_OPERATION",
      });
    } else {
      this.error("Database", "Database operation failed", undefined, {
        operation,
        table,
        error,
        action: "DB_OPERATION_FAILED",
      });
    }
  }
}

// Export singleton instance
export const logger = new Logger();
