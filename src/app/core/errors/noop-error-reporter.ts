import { ErrorReporter } from './error-reporter';

export class NoopErrorReporter implements ErrorReporter {
  report(_error: unknown): void {
    void _error;
  }
}
