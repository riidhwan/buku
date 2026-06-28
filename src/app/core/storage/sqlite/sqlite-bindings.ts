import {
  SqliteNamedValues,
  SqliteStatementValues,
  SqliteValue,
  SqliteValues,
} from './sqlite-value';

interface BoundSqliteStatement {
  readonly statement: string;
  readonly values: SqliteValues;
}

const namedParameterPattern = /[:@$]([A-Za-z_][A-Za-z0-9_]*)/g;

export function bindSqliteStatement(
  statement: string,
  values: SqliteStatementValues,
): BoundSqliteStatement {
  if (isSqliteValues(values)) {
    return { statement, values: [...values] };
  }

  const boundValues: SqliteValueBuilder = [];
  const boundStatement = statement.replace(
    namedParameterPattern,
    (_placeholder: string, name: string) => {
      boundValues.push(namedValue(values, name));
      return '?';
    },
  );

  return { statement: boundStatement, values: boundValues };
}

function isSqliteValues(values: SqliteStatementValues): values is SqliteValues {
  return Array.isArray(values);
}

type SqliteValueBuilder = SqliteValue[];

function namedValue(values: SqliteNamedValues, name: string): SqliteValue {
  if (!Object.prototype.hasOwnProperty.call(values, name)) {
    throw new Error(`Missing SQLite value for named parameter "${name}".`);
  }

  return values[name] ?? null;
}
