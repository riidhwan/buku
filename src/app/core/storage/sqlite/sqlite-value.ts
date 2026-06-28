export type SqliteValue = string | number | null;

export type SqliteValues = readonly SqliteValue[];

export type SqliteNamedValues = Readonly<Record<string, SqliteValue>>;

export type SqliteStatementValues = SqliteValues | SqliteNamedValues;

export type SqliteRow = Readonly<Record<string, SqliteValue>>;
