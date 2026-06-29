import { sqliteMigrations } from './sqlite-migrations';

describe('sqliteMigrations', () => {
  it('registers the Library entry content override table in migration version 2', () => {
    const migration = sqliteMigrations.find((candidate) => candidate.version === 2);

    expect(migration?.statements.join('\n')).toContain('library_series_entry_content_overrides');
  });
});
