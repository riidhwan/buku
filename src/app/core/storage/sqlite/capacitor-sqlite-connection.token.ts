import { InjectionToken } from '@angular/core';
import {
  CapacitorSQLite,
  capSQLiteResult,
  capSQLiteVersionUpgrade,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

export interface CapacitorSqliteConnection {
  addUpgradeStatement(database: string, upgrade: readonly capSQLiteVersionUpgrade[]): Promise<void>;
  createConnection(
    database: string,
    encrypted: boolean,
    mode: string,
    version: number,
    readonlyConnection: boolean,
  ): Promise<SQLiteDBConnection>;
  isConnection(database: string, readonlyConnection: boolean): Promise<capSQLiteResult>;
  retrieveConnection(database: string, readonlyConnection: boolean): Promise<SQLiteDBConnection>;
}

export const CAPACITOR_SQLITE_CONNECTION = new InjectionToken<CapacitorSqliteConnection>(
  'CAPACITOR_SQLITE_CONNECTION',
  {
    factory: () => new SQLiteConnection(CapacitorSQLite),
  },
);
