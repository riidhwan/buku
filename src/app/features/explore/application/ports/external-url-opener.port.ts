import { InjectionToken } from '@angular/core';

export interface ExternalUrlOpenerPort {
  open(url: string): Promise<void>;
}

export const EXTERNAL_URL_OPENER = new InjectionToken<ExternalUrlOpenerPort>('EXTERNAL_URL_OPENER');
