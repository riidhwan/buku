import { makeEnvironmentProviders } from '@angular/core';

import { APP_CONFIG } from './app-config.token';
import { AppConfig } from './app-config';

export function provideAppConfig(config: AppConfig) {
  return makeEnvironmentProviders([{ provide: APP_CONFIG, useValue: config }]);
}
