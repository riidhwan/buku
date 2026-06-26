import { ErrorHandler, inject, Injectable } from '@angular/core';

import { ERROR_REPORTER } from './error-reporter.token';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly errorReporter = inject(ERROR_REPORTER);

  handleError(error: unknown): void {
    this.errorReporter.report(error);
  }
}
