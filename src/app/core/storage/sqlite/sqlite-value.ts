export type SqliteValue = string | number | null;

export type SqliteValues = readonly SqliteValue[];

export type SqliteRow = Readonly<Record<string, SqliteValue>>;
