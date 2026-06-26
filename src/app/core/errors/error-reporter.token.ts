import { InjectionToken } from '@angular/core';

import { ErrorReporter } from './error-reporter';

export const ERROR_REPORTER = new InjectionToken<ErrorReporter>('ERROR_REPORTER');
