import { Logger } from './logger';

export class ConsoleLogger implements Logger {
  debug(message: string, context?: unknown): void {
    console.debug(message, context);
  }

  info(message: string, context?: unknown): void {
    console.info(message, context);
  }

  warn(message: string, context?: unknown): void {
    console.warn(message, context);
  }

  error(message: string, context?: unknown): void {
    console.error(message, context);
  }
}
