/**
 * Logger Service
 * 
 * Simple console-based logging for serverless environments.
 * File logging removed for Vercel compatibility.
 */

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

class Logger {
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
      return data.slice(0, 100).map((item) => this.sanitizeData(item));
    }

    if (typeof data === "object" && data !== null) {
      const sanitized: Record<string, unknown> = {};
      const keys = Object.keys(data).slice(0, 50);
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
   * Log debug message
   */
  public debug(service: string, message: string, data?: unknown): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] [${service}] ${message}`, data ? this.sanitizeData(data) : "");
    }
  }

  /**
   * Log info message
   */
  public info(service: string, message: string, data?: unknown): void {
    console.log(`[INFO] [${service}] ${message}`, data ? this.sanitizeData(data) : "");
  }

  /**
   * Log warning message
   */
  public warn(service: string, message: string, data?: unknown): void {
    console.warn(`[WARN] [${service}] ${message}`, data ? this.sanitizeData(data) : "");
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
    if (error) {
      console.error(`[ERROR] [${service}] ${message}`, data ? this.sanitizeData(data) : "", error);
    } else {
      console.error(`[ERROR] [${service}] ${message}`, data ? this.sanitizeData(data) : "");
    }
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
    const progress = totalChunks > 0 ? Math.round((currentChunk / totalChunks) * 100) : 0;
    this.debug("EmbeddingService", "Embedding progress", {
      materialId,
      progress: `${progress}%`,
      chunkTitle,
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
      });
    } else {
      this.error("QuestionGenerator", "Question generation failed", undefined, {
        materialId,
        courseId,
        error,
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
    this.debug("ChatService", "Chat message", {
      materialId,
      userId,
      role,
      messageLength,
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
    this.debug("API", "Request processed", {
      method,
      path,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      userId,
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
      });
    } else {
      this.error("Database", "Database operation failed", undefined, {
        operation,
        table,
        error,
      });
    }
  }

  // No-op for compatibility
  public stopAutoCleanup(): void {}
}

// Export singleton instance
export const logger = new Logger();
