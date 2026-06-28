import { SqliteRow, SqliteStatementValues } from './sqlite-value';

export interface SqliteDatabase {
  query<Row extends SqliteRow>(
    statement: string,
    values?: SqliteStatementValues,
  ): Promise<readonly Row[]>;
  run(statement: string, values?: SqliteStatementValues): Promise<void>;
  execute(statements: string): Promise<void>;
  transaction<Result>(work: (database: SqliteDatabase) => Promise<Result>): Promise<Result>;
}
