import { inject, Injectable } from '@angular/core';
import { ExternalUrlOpenerPort } from '../application/ports/external-url-opener.port';
import { EXPLORE_BROWSER_PLUGIN } from './capacitor-explore-browser';

@Injectable()
export class CapacitorExternalUrlOpenerAdapter implements ExternalUrlOpenerPort {
  private readonly plugin = inject(EXPLORE_BROWSER_PLUGIN);

  public async open(url: string): Promise<void> {
    await this.plugin.openExternal({ url });
  }
}
