import { bindSqliteStatement } from './sqlite-bindings';

describe('bindSqliteStatement', () => {
  it('keeps positional values unchanged', () => {
    expect(bindSqliteStatement('SELECT * FROM library_series WHERE id = ?;', ['series-1'])).toEqual(
      {
        statement: 'SELECT * FROM library_series WHERE id = ?;',
        values: ['series-1'],
      },
    );
  });

  it('converts named parameters into positional placeholders', () => {
    expect(
      bindSqliteStatement(
        `
          INSERT INTO library_series (id, title, normalized_title, created_at, updated_at)
          VALUES (:id, :title, :normalizedTitle, :createdAt, :updatedAt);
        `,
        {
          id: 'series-1',
          title: 'Series',
          normalizedTitle: 'series',
          createdAt: '2026-06-27T10:00:00.000Z',
          updatedAt: '2026-06-27T10:00:00.000Z',
        },
      ),
    ).toEqual({
      statement: `
          INSERT INTO library_series (id, title, normalized_title, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?);
        `,
      values: [
        'series-1',
        'Series',
        'series',
        '2026-06-27T10:00:00.000Z',
        '2026-06-27T10:00:00.000Z',
      ],
    });
  });

  it('reuses values when the same named parameter appears more than once', () => {
    expect(
      bindSqliteStatement(
        'SELECT * FROM library_series WHERE id = :seriesId OR parent_id = :seriesId;',
        {
          seriesId: 'series-1',
        },
      ),
    ).toEqual({
      statement: 'SELECT * FROM library_series WHERE id = ? OR parent_id = ?;',
      values: ['series-1', 'series-1'],
    });
  });

  it('reuses each named value at every matching placeholder position', () => {
    expect(
      bindSqliteStatement(
        `
          INSERT INTO library_series_entries (
            id,
            created_at,
            updated_at,
            title,
            display_title
          )
          VALUES (:id, :now, :now, :title, :title);
        `,
        {
          id: 'entry-1',
          now: '2026-06-27T10:00:00.000Z',
          title: 'Chapter 1',
        },
      ),
    ).toEqual({
      statement: `
          INSERT INTO library_series_entries (
            id,
            created_at,
            updated_at,
            title,
            display_title
          )
          VALUES (?, ?, ?, ?, ?);
        `,
      values: [
        'entry-1',
        '2026-06-27T10:00:00.000Z',
        '2026-06-27T10:00:00.000Z',
        'Chapter 1',
        'Chapter 1',
      ],
    });
  });

  it('accepts sqlite named parameter prefixes', () => {
    expect(
      bindSqliteStatement('SELECT * FROM library_series WHERE id = @id OR id = $fallbackId;', {
        id: 'series-1',
        fallbackId: 'series-2',
      }),
    ).toEqual({
      statement: 'SELECT * FROM library_series WHERE id = ? OR id = ?;',
      values: ['series-1', 'series-2'],
    });
  });

  it('rejects missing named values', () => {
    expect(() =>
      bindSqliteStatement('SELECT * FROM library_series WHERE id = :id;', {}),
    ).toThrowError('Missing SQLite value for named parameter "id".');
  });
});
