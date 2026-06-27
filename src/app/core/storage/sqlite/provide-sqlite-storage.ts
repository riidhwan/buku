import { EnvironmentProviders, Provider, inject, provideAppInitializer } from '@angular/core';

import {
  CapacitorSqliteDatabaseAdapter,
  sqliteDatabaseProvider,
} from './capacitor-sqlite-database.adapter';
import { sqliteMigrations } from './migrations/sqlite-migrations';
import { SQLITE_MIGRATIONS } from './sqlite-migration';

export function provideSqliteStorage(): (Provider | EnvironmentProviders)[] {
  return [
    CapacitorSqliteDatabaseAdapter,
    {
      provide: SQLITE_MIGRATIONS,
      useValue: sqliteMigrations,
    },
    sqliteDatabaseProvider,
    provideAppInitializer(() => inject(CapacitorSqliteDatabaseAdapter).initialize()),
  ];
}
