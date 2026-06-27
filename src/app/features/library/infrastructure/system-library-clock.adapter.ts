import { Injectable } from '@angular/core';
import { LibraryClock } from '../application/ports/library-clock.port';

@Injectable()
export class SystemLibraryClockAdapter implements LibraryClock {
  public now(): string {
    return new Date().toISOString();
  }
}
