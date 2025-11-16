/**
 * Logger utility class for controlling console output in different environments
 */
export class Logger {
  private static isProduction = process.env.NODE_ENV === 'production';

  static log(...args: any[]): void {
    if (!Logger.isProduction) {
      console.log(...args);
    }
  }

  static warn(...args: any[]): void {
    if (!Logger.isProduction) {
      console.warn(...args);
    }
  }

  static error(...args: any[]): void {
    // Errors should always be logged
    console.error(...args);
  }
}