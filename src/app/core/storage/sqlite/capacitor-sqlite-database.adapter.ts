import { Injectable, inject } from '@angular/core';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';

import { ERROR_REPORTER } from '@core/errors/error-reporter.token';
import { LOGGER } from '@core/logging/logger.token';

import { CAPACITOR_SQLITE_CONNECTION } from './capacitor-sqlite-connection.token';
import { SqliteDatabase } from './sqlite-database';
import { SQLITE_DATABASE } from './sqlite-database.token';
import { SQLITE_MIGRATIONS, SqliteMigration } from './sqlite-migration';
import { SqliteRow, SqliteValue, SqliteValues } from './sqlite-value';

const databaseName = 'buku';
const sqliteMode = 'no-encryption';

@Injectable()
export class CapacitorSqliteDatabaseAdapter implements SqliteDatabase {
  private readonly sqlite = inject(CAPACITOR_SQLITE_CONNECTION);
  private readonly migrations = inject(SQLITE_MIGRATIONS, { optional: true }) ?? [];
  private readonly logger = inject(LOGGER, { optional: true });
  private readonly errorReporter = inject(ERROR_REPORTER, { optional: true });
  private connection: SQLiteDBConnection | null = null;
  private initialization: Promise<void> | null = null;
  private initializationError: Error | null = null;
  private transactionDepth = 0;

  public async initialize(): Promise<void> {
    this.initialization ??= this.openDatabase().catch((error: unknown) => {
      const initializationError = toError(error);
      this.initializationError = initializationError;
      this.logger?.error('SQLite initialization failed.', initializationError);
      this.errorReporter?.report(initializationError);
    });

    await this.initialization;
  }

  public async query<Row extends SqliteRow>(
    statement: string,
    values: SqliteValues = [],
  ): Promise<readonly Row[]> {
    const database = await this.database();
    const result = await database.query(statement, [...values]);
    return toRows(result.values) as readonly Row[];
  }

  public async run(statement: string, values: SqliteValues = []): Promise<void> {
    const database = await this.database();
    await database.run(statement, [...values], this.transactionDepth === 0);
  }

  public async execute(statements: string): Promise<void> {
    const database = await this.database();
    await database.execute(statements, this.transactionDepth === 0);
  }

  public async transaction<Result>(
    work: (database: SqliteDatabase) => Promise<Result>,
  ): Promise<Result> {
    const database = await this.database();
    await database.beginTransaction();
    this.transactionDepth += 1;
    try {
      const result = await work(this);
      await database.commitTransaction();
      return result;
    } catch (error) {
      await database.rollbackTransaction();
      throw error;
    } finally {
      this.transactionDepth -= 1;
    }
  }

  private async database(): Promise<SQLiteDBConnection> {
    await this.initialize();
    if (this.initializationError !== null) {
      throw this.initializationError;
    }
    if (this.connection === null) {
      throw new Error('SQLite database connection was not initialized.');
    }

    return this.connection;
  }

  private async openDatabase(): Promise<void> {
    const migrations = orderedMigrations(this.migrations);
    const latestVersion = latestMigrationVersion(migrations);
    await this.registerMigrations(migrations);
    this.connection = await this.createOrRetrieveConnection(latestVersion);
    await this.connection.open();
    await this.connection.execute('PRAGMA foreign_keys = ON;', false);
  }

  private async registerMigrations(migrations: readonly SqliteMigration[]): Promise<void> {
    if (migrations.length === 0) {
      return;
    }

    await this.sqlite.addUpgradeStatement(
      databaseName,
      migrations.map((migration) => ({
        toVersion: migration.version,
        statements: [...migration.statements],
      })),
    );
  }

  private async createOrRetrieveConnection(version: number): Promise<SQLiteDBConnection> {
    const exists = await this.sqlite.isConnection(databaseName, false);
    if (exists.result === true) {
      return this.sqlite.retrieveConnection(databaseName, false);
    }

    return this.sqlite.createConnection(databaseName, false, sqliteMode, version, false);
  }
}

export const sqliteDatabaseProvider = {
  provide: SQLITE_DATABASE,
  useExisting: CapacitorSqliteDatabaseAdapter,
};

function orderedMigrations(migrations: readonly SqliteMigration[]): readonly SqliteMigration[] {
  const ordered = [...migrations].sort((left, right) => left.version - right.version);
  for (const [index, migration] of ordered.entries()) {
    if (migration.version !== index + 1) {
      throw new Error(`SQLite migrations must be contiguous from version 1.`);
    }
  }

  return ordered;
}

function latestMigrationVersion(migrations: readonly SqliteMigration[]): number {
  const latest = migrations[migrations.length - 1];
  return latest === undefined ? 1 : latest.version;
}

function toRows(value: unknown): readonly SqliteRow[] {
  if (value === undefined) {
    return [];
  }
  if (!isUnknownArray(value) || !value.every(isSqliteRow)) {
    throw new Error('SQLite query returned rows in an unexpected shape.');
  }

  return value;
}

function isSqliteRow(value: unknown): value is SqliteRow {
  return isRecord(value) && Object.values(value).every(isSqliteValue);
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSqliteValue(value: unknown): value is SqliteValue {
  return value === null || typeof value === 'string' || typeof value === 'number';
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Unexpected SQLite initialization failure.');
}
