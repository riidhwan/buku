import { InjectionToken } from '@angular/core';

export interface SqliteMigration {
  readonly version: number;
  readonly statements: readonly string[];
}

export const SQLITE_MIGRATIONS = new InjectionToken<readonly SqliteMigration[]>(
  'SQLITE_MIGRATIONS',
);
