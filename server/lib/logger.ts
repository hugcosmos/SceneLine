/**
 * Logging utility for SceneLine
 * Supports both file output and console output with different formats
 */

import fs from "fs";
import path from "path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

// Log file path
const LOG_DIR = path.resolve("logs");
const LOG_FILE = path.join(LOG_DIR, "sceneline.log");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create write stream for file logging
const logStream = fs.createWriteStream(LOG_FILE, { flags: "a" });

class Logger {
  private service: string;
  private level: LogLevel;

  constructor(service: string, level: LogLevel = "info") {
    this.service = service;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const envLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
    return levels.indexOf(level) >= levels.indexOf(envLevel);
  }

  private formatTime(): string {
    const now = new Date();
    return now.toLocaleTimeString("en-US", { hour12: false });
  }

  private formatDate(): string {
    return new Date().toISOString().split("T")[0];
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const time = this.formatTime();
    
    // File output: JSON format
    const fileEntry = {
      level,
      timestamp,
      service: this.service,
      message,
      ...context,
    };
    logStream.write(JSON.stringify(fileEntry) + "\n");

    // Console output: Simple human-readable format
    const levelColor = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m",  // Green
      warn: "\x1b[33m",  // Yellow
      error: "\x1b[31m", // Red
    }[level];
    const resetColor = "\x1b[0m";

    // Simple format: [TIME] [LEVEL] [SERVICE] Message
    const consoleMsg = `${levelColor}[${time}]${resetColor} [${level.toUpperCase().padEnd(5)}] [${this.service.padEnd(8)}] ${message}`;
    
    // Add key context items to console output (max 2 items)
    if (context && Object.keys(context).length > 0) {
      const keyItems = Object.entries(context).slice(0, 2);
      const contextStr = keyItems.map(([k, v]) => `${k}=${v}`).join(" ");
      const fullConsoleMsg = `${consoleMsg} ${contextStr}`;
      
      switch (level) {
        case "error":
          console.error(fullConsoleMsg);
          break;
        case "warn":
          console.warn(fullConsoleMsg);
          break;
        default:
          console.log(fullConsoleMsg);
      }
    } else {
      switch (level) {
        case "error":
          console.error(consoleMsg);
          break;
        case "warn":
          console.warn(consoleMsg);
          break;
        default:
          console.log(consoleMsg);
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  // Create child logger with additional context
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.service, this.level);
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, message: string, context?: LogContext) => {
      originalLog(level, message, { ...additionalContext, ...context });
    };
    return childLogger;
  }
}

// Export singleton logger factory
export function createLogger(service: string): Logger {
  return new Logger(service);
}

// Request logging middleware for Express
export function requestLogger(service: string) {
  const logger = createLogger(service);
  
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    res.on("finish", () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? "warn" : "info";
      logger.log(level, `${req.method} ${req.path} ${res.statusCode}`, {
        duration: `${duration}ms`,
      });
    });
    
    next();
  };
}

// Performance timer utility
export function createTimer(logger: Logger, operation: string) {
  const start = Date.now();
  
  return {
    end: (context?: LogContext) => {
      const duration = Date.now() - start;
      logger.info(`${operation} completed`, { duration: `${duration}ms`, ...context });
      return duration;
    },
    fail: (error: Error, context?: LogContext) => {
      const duration = Date.now() - start;
      logger.error(`${operation} failed`, { 
        duration: `${duration}ms`, 
        error: error.message,
        ...context 
      });
      return duration;
    },
  };
}
