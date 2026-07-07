import { sqliteMigrations } from './sqlite-migrations';

describe('sqliteMigrations', () => {
  it('registers the Library entry content override table in migration version 2', () => {
    const migration = sqliteMigrations.find((candidate) => candidate.version === 2);

    expect(migration?.statements.join('\n')).toContain('library_series_entry_content_overrides');
  });

  it('registers the Library entry header visibility column in migration version 3', () => {
    const migration = sqliteMigrations.find((candidate) => candidate.version === 3);

    expect(migration?.statements.join('\n')).toContain('reader_header_visible');
  });
});
