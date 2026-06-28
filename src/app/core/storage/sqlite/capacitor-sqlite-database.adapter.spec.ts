import { TestBed } from '@angular/core/testing';
import { DBSQLiteValues, SQLiteDBConnection, capSQLiteChanges } from '@capacitor-community/sqlite';

import {
  CAPACITOR_SQLITE_CONNECTION,
  CapacitorSqliteConnection,
} from './capacitor-sqlite-connection.token';
import { CapacitorSqliteDatabaseAdapter } from './capacitor-sqlite-database.adapter';
import { ERROR_REPORTER } from '../../errors/error-reporter.token';
import { LOGGER } from '../../logging/logger.token';
import { SQLITE_MIGRATIONS, SqliteMigration } from './sqlite-migration';

describe('CapacitorSqliteDatabaseAdapter', () => {
  it('disables per-statement transactions inside an explicit transaction', async () => {
    const { adapter, database } = setup();
    await adapter.initialize();
    database.resetCapturedStatements();

    await adapter.transaction(async (transaction) => {
      await transaction.run('INSERT INTO library_series (id) VALUES (?);', ['series-1']);
      await transaction.execute('UPDATE library_series SET title = "Series";');
    });

    expect(database.beginTransactionCount).toBe(1);
    expect(database.commitTransactionCount).toBe(1);
    expect(database.rollbackTransactionCount).toBe(0);
    expect(database.runTransactions).toEqual([false]);
    expect(database.executeTransactions).toEqual([false]);
  });

  it('keeps standalone statements transaction-wrapped by Capacitor', async () => {
    const { adapter, database } = setup();
    await adapter.initialize();
    database.resetCapturedStatements();

    await adapter.run('INSERT INTO library_series (id) VALUES (?);', ['series-1']);
    await adapter.run('VACUUM;');
    await adapter.execute('UPDATE library_series SET title = "Series";');

    expect(database.runTransactions).toEqual([true, true]);
    expect(database.executeTransactions).toEqual([true]);
  });

  it('converts named parameters before sending statements to Capacitor SQLite', async () => {
    const { adapter, database } = setup();
    await adapter.initialize();
    database.resetCapturedStatements();

    await adapter.run(
      'INSERT INTO library_series (id, title, normalized_title) VALUES (:id, :title, :title);',
      {
        id: 'series-1',
        title: 'Series',
      },
    );
    await adapter.query('SELECT * FROM library_series WHERE id = :id;', { id: 'series-1' });

    expect(database.runStatements).toEqual([
      'INSERT INTO library_series (id, title, normalized_title) VALUES (?, ?, ?);',
    ]);
    expect(database.runValues).toEqual([['series-1', 'Series', 'Series']]);
    expect(database.queryStatements).toEqual(['SELECT * FROM library_series WHERE id = ?;']);
    expect(database.queryValues).toEqual([['series-1']]);
  });

  it('rolls back failed transactions and restores standalone statement behavior', async () => {
    const { adapter, database } = setup();
    await adapter.initialize();
    database.resetCapturedStatements();

    await expectAsync(
      adapter.transaction(async (transaction) => {
        await transaction.run('INSERT INTO library_series (id) VALUES (?);', ['series-1']);
        throw new Error('work failed');
      }),
    ).toBeRejectedWithError('work failed');

    await adapter.run('INSERT INTO library_series (id) VALUES (?);', ['series-2']);

    expect(database.beginTransactionCount).toBe(1);
    expect(database.commitTransactionCount).toBe(0);
    expect(database.rollbackTransactionCount).toBe(1);
    expect(database.runTransactions).toEqual([false, true]);
  });

  it('registers ordered migrations and opens the latest schema version', async () => {
    const migrationOne: SqliteMigration = {
      version: 1,
      statements: ['CREATE TABLE library_series (id TEXT);'],
    };
    const migrationTwo: SqliteMigration = {
      version: 2,
      statements: ['ALTER TABLE library_series ADD COLUMN title TEXT;'],
    };
    const { adapter, connection } = setup([migrationTwo, migrationOne]);

    await adapter.initialize();

    expect(connection.upgrades).toEqual([
      {
        database: 'buku',
        upgrade: [
          { toVersion: 1, statements: ['CREATE TABLE library_series (id TEXT);'] },
          { toVersion: 2, statements: ['ALTER TABLE library_series ADD COLUMN title TEXT;'] },
        ],
      },
    ]);
    expect(connection.createdVersion).toBe(2);
  });

  it('rejects non-contiguous migrations', async () => {
    const { adapter } = setup([{ version: 2, statements: ['SELECT 1;'] }]);

    await expectAsync(adapter.query('SELECT 1;')).toBeRejectedWithError(
      'SQLite migrations must be contiguous from version 1.',
    );
  });

  it('retrieves an existing connection instead of creating another one', async () => {
    const { adapter, connection } = setup();
    connection.connectionExists = true;

    await adapter.initialize();

    expect(connection.createConnectionCount).toBe(0);
    expect(connection.retrieveConnectionCount).toBe(1);
  });

  it('initializes without a migrations provider', async () => {
    const { adapter, connection } = setup([], { provideMigrations: false });

    await adapter.initialize();

    expect(connection.upgrades).toEqual([]);
    expect(connection.createdVersion).toBe(1);
  });

  it('returns typed rows and treats missing query values as an empty result', async () => {
    const { adapter, database } = setup();
    database.queryResult = { values: [{ id: 'series-1', entry_count: 1, source_host: null }] };

    await expectAsync(adapter.query('SELECT * FROM library_series;')).toBeResolvedTo([
      { id: 'series-1', entry_count: 1, source_host: null },
    ]);

    database.queryResult = {};

    await expectAsync(adapter.query('SELECT * FROM library_series;')).toBeResolvedTo([]);
  });

  it('rejects rows returned in an unexpected shape', async () => {
    const { adapter, database } = setup();
    database.queryResult = { values: [{ ok: true }] };

    await expectAsync(adapter.query('SELECT * FROM library_series;')).toBeRejectedWithError(
      'SQLite query returned rows in an unexpected shape.',
    );
  });

  it('reports initialization failures and rejects later database work', async () => {
    const { adapter, connection, errorReporter, logger } = setup();
    connection.createFailure = new Error('native failed');

    await adapter.initialize();

    await expectAsync(adapter.query('SELECT 1;')).toBeRejectedWithError('native failed');
    expect(logger.errors.length).toBe(1);
    expect(errorReporter.reported.length).toBe(1);
  });

  it('normalizes non-Error initialization failures', async () => {
    const { adapter, connection } = setup();
    (connection as unknown as { createFailure: string }).createFailure = 'native failed';

    await adapter.initialize();

    await expectAsync(adapter.query('SELECT 1;')).toBeRejectedWithError(
      'Unexpected SQLite initialization failure.',
    );
  });

  it('rejects database work when initialization leaves no connection', async () => {
    const { adapter } = setup();
    await adapter.initialize();
    (adapter as unknown as { connection: null }).connection = null;

    await expectAsync(adapter.query('SELECT 1;')).toBeRejectedWithError(
      'SQLite database connection was not initialized.',
    );
  });
});

function setup(
  migrations: readonly SqliteMigration[] = [],
  options: { readonly provideMigrations?: boolean } = {},
): {
  readonly adapter: CapacitorSqliteDatabaseAdapter;
  readonly connection: FakeCapacitorSqliteConnection;
  readonly database: FakeSqliteConnection;
  readonly errorReporter: FakeErrorReporter;
  readonly logger: FakeLogger;
} {
  const database = new FakeSqliteConnection();
  const connection = new FakeCapacitorSqliteConnection(database);
  const logger = new FakeLogger();
  const errorReporter = new FakeErrorReporter();

  TestBed.configureTestingModule({
    providers: [
      CapacitorSqliteDatabaseAdapter,
      { provide: CAPACITOR_SQLITE_CONNECTION, useValue: connection },
      ...(options.provideMigrations === false
        ? []
        : [{ provide: SQLITE_MIGRATIONS, useValue: migrations }]),
      { provide: LOGGER, useValue: logger },
      { provide: ERROR_REPORTER, useValue: errorReporter },
    ],
  });

  return {
    adapter: TestBed.inject(CapacitorSqliteDatabaseAdapter),
    connection,
    database,
    errorReporter,
    logger,
  };
}

class FakeCapacitorSqliteConnection implements CapacitorSqliteConnection {
  public connectionExists = false;
  public createConnectionCount = 0;
  public retrieveConnectionCount = 0;
  public createdVersion: number | null = null;
  public createFailure: Error | null = null;
  public readonly upgrades: {
    readonly database: string;
    readonly upgrade: readonly {
      readonly toVersion: number;
      readonly statements: readonly string[];
    }[];
  }[] = [];

  public constructor(private readonly database: FakeSqliteConnection) {}

  public addUpgradeStatement(
    database: string,
    upgrade: readonly { readonly toVersion: number; readonly statements: readonly string[] }[],
  ): Promise<void> {
    this.upgrades.push({ database, upgrade });
    return Promise.resolve();
  }

  public createConnection(
    _database: string,
    _encrypted: boolean,
    _mode: string,
    version: number,
  ): Promise<SQLiteDBConnection> {
    this.createConnectionCount += 1;
    this.createdVersion = version;
    if (this.createFailure !== null) {
      return Promise.reject(this.createFailure);
    }

    return Promise.resolve(this.database as unknown as SQLiteDBConnection);
  }

  public isConnection(): Promise<{ readonly result: boolean }> {
    return Promise.resolve({ result: this.connectionExists });
  }

  public retrieveConnection(): Promise<SQLiteDBConnection> {
    this.retrieveConnectionCount += 1;
    return Promise.resolve(this.database as unknown as SQLiteDBConnection);
  }
}

class FakeSqliteConnection {
  public beginTransactionCount = 0;
  public commitTransactionCount = 0;
  public rollbackTransactionCount = 0;
  public queryResult: DBSQLiteValues = { values: [] };
  public readonly queryStatements: string[] = [];
  public readonly queryValues: unknown[][] = [];
  public readonly runStatements: string[] = [];
  public readonly runValues: unknown[][] = [];
  public readonly runTransactions: boolean[] = [];
  public readonly executeTransactions: boolean[] = [];

  public open(): Promise<void> {
    return Promise.resolve();
  }

  public query(statement: string, values?: readonly unknown[]): Promise<DBSQLiteValues> {
    this.queryStatements.push(statement);
    this.queryValues.push([...(values ?? [])]);
    return Promise.resolve(this.queryResult);
  }

  public run(
    statement: string,
    values?: readonly unknown[],
    transaction = true,
  ): Promise<capSQLiteChanges> {
    this.runStatements.push(statement);
    this.runValues.push([...(values ?? [])]);
    this.runTransactions.push(transaction);
    return Promise.resolve({});
  }

  public execute(_statements: string, transaction = true): Promise<capSQLiteChanges> {
    this.executeTransactions.push(transaction);
    return Promise.resolve({});
  }

  public beginTransaction(): Promise<capSQLiteChanges> {
    this.beginTransactionCount += 1;
    return Promise.resolve({});
  }

  public commitTransaction(): Promise<capSQLiteChanges> {
    this.commitTransactionCount += 1;
    return Promise.resolve({});
  }

  public rollbackTransaction(): Promise<capSQLiteChanges> {
    this.rollbackTransactionCount += 1;
    return Promise.resolve({});
  }

  public resetCapturedStatements(): void {
    this.queryStatements.length = 0;
    this.queryValues.length = 0;
    this.runStatements.length = 0;
    this.runValues.length = 0;
    this.runTransactions.length = 0;
    this.executeTransactions.length = 0;
  }
}

class FakeLogger {
  public readonly debugMessages: string[] = [];
  public readonly infoMessages: string[] = [];
  public readonly warnings: string[] = [];
  public readonly errors: { readonly message: string; readonly context: unknown }[] = [];

  public debug(message: string): void {
    this.debugMessages.push(message);
  }

  public info(message: string): void {
    this.infoMessages.push(message);
  }

  public warn(message: string): void {
    this.warnings.push(message);
  }

  public error(message: string, context?: unknown): void {
    this.errors.push({ message, context });
  }
}

class FakeErrorReporter {
  public readonly reported: unknown[] = [];

  public report(error: unknown): void {
    this.reported.push(error);
  }
}
