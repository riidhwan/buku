import { bootstrapApplication } from '@angular/platform-browser';
import { ErrorHandler } from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideAppConfig } from './app/core/config/provide-app-config';
import { GlobalErrorHandler } from './app/core/errors/global-error-handler';
import { ERROR_REPORTER } from './app/core/errors/error-reporter.token';
import { NoopErrorReporter } from './app/core/errors/noop-error-reporter';
import { ConsoleLogger } from './app/core/logging/console-logger';
import { LOGGER } from './app/core/logging/logger.token';
import { provideLibrary } from './app/features/library/infrastructure/provide-library';
import { READING_LIBRARY_SAVE } from './app/features/explore/application/ports/reading-library-save.port';
import { ReadingLibrarySaveAdapter } from './app/reading-library-save.adapter';
import { environment } from './environments/environment';

void bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    { provide: ERROR_REPORTER, useClass: NoopErrorReporter },
    { provide: LOGGER, useClass: ConsoleLogger },
    { provide: READING_LIBRARY_SAVE, useClass: ReadingLibrarySaveAdapter },
    provideLibrary(),
    provideAppConfig(environment.appConfig),
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
});
