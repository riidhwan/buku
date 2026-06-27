import { SqliteRow, SqliteValues } from './sqlite-value';

export interface SqliteDatabase {
  query<Row extends SqliteRow>(statement: string, values?: SqliteValues): Promise<readonly Row[]>;
  run(statement: string, values?: SqliteValues): Promise<void>;
  execute(statements: string): Promise<void>;
  transaction<Result>(work: (database: SqliteDatabase) => Promise<Result>): Promise<Result>;
}
