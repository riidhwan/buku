import { TestBed } from '@angular/core/testing';
import { SQLITE_DATABASE } from '@core/storage/sqlite/sqlite-database.token';
import { SqliteDatabase } from '@core/storage/sqlite/sqlite-database';
import { SqliteRow, SqliteStatementValues } from '@core/storage/sqlite/sqlite-value';
import { ManualChapterNavigationRuleSet } from '../domain/manual-chapter-navigation-rule';
import { SqliteManualChapterNavigationRuleRepositoryAdapter } from './sqlite-manual-chapter-navigation-rule-repository.adapter';

interface ManualChapterRuleRow extends SqliteRow {
  readonly id: string;
  readonly host: string;
  readonly path_prefix: string | null;
  readonly enabled: number;
  readonly previous_rule_json: string | null;
  readonly next_rule_json: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

class FakeSqliteDatabase implements SqliteDatabase {
  public rows: ManualChapterRuleRow[] = [];
  public duplicateRows: readonly { readonly id: string }[] = [];
  public savedValues: SqliteStatementValues | undefined;
  public deletedValues: SqliteStatementValues | undefined;
  public failRun = false;

  public query<Row extends SqliteRow>(
    statement: string,
    _values?: SqliteStatementValues,
  ): Promise<readonly Row[]> {
    if (statement.includes('SELECT id')) {
      return Promise.resolve(this.duplicateRows as unknown as readonly Row[]);
    }

    return Promise.resolve(this.rows as unknown as readonly Row[]);
  }

  public run(statement: string, values?: SqliteStatementValues): Promise<void> {
    if (this.failRun) {
      return Promise.reject(new Error('database failed'));
    }

    if (statement.includes('DELETE')) {
      this.deletedValues = values;
    } else {
      this.savedValues = values;
    }
    return Promise.resolve();
  }

  public execute(): Promise<void> {
    return Promise.resolve();
  }

  public transaction<Result>(work: (database: SqliteDatabase) => Promise<Result>): Promise<Result> {
    return work(this);
  }
}

describe('SqliteManualChapterNavigationRuleRepositoryAdapter', () => {
  let database: FakeSqliteDatabase;
  let repository: SqliteManualChapterNavigationRuleRepositoryAdapter;

  beforeEach(() => {
    database = new FakeSqliteDatabase();
    TestBed.configureTestingModule({
      providers: [
        SqliteManualChapterNavigationRuleRepositoryAdapter,
        { provide: SQLITE_DATABASE, useValue: database },
      ],
    });

    repository = TestBed.inject(SqliteManualChapterNavigationRuleRepositoryAdapter);
  });

  it('lists persisted rule sets from SQLite rows', async () => {
    database.rows = [
      {
        id: 'rules-1',
        host: 'example.com',
        path_prefix: '/story/',
        enabled: 1,
        previous_rule_json: JSON.stringify(rule('previous', 'a.prev')),
        next_rule_json: JSON.stringify(rule('next', 'a.next')),
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-02T00:00:00.000Z',
      },
    ];

    await expectAsync(repository.list()).toBeResolvedTo([
      {
        id: 'rules-1',
        scope: { host: 'example.com', pathPrefix: '/story/' },
        enabled: true,
        previous: rule('previous', 'a.prev'),
        next: rule('next', 'a.next'),
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ]);

    database.rows = [
      {
        id: 'rules-empty',
        host: 'example.com',
        path_prefix: null,
        enabled: 0,
        previous_rule_json: null,
        next_rule_json: null,
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-02T00:00:00.000Z',
      },
    ];

    await expectAsync(repository.list()).toBeResolvedTo([
      {
        id: 'rules-empty',
        scope: { host: 'example.com', pathPrefix: null },
        enabled: false,
        previous: null,
        next: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    ]);
  });

  it('saves rule sets as structured columns and JSON rule payloads', async () => {
    await expectAsync(repository.save(ruleSet())).toBeResolvedTo({ ok: true });

    expect(database.savedValues).toEqual([
      'rules-1',
      'example.com',
      '/story/',
      1,
      JSON.stringify(rule('previous', 'a.prev')),
      JSON.stringify(rule('next', 'a.next')),
      '2026-08-01T00:00:00.000Z',
      '2026-08-02T00:00:00.000Z',
    ]);

    await repository.save({
      ...ruleSet(),
      enabled: false,
      previous: null,
      next: null,
    });

    expect(database.savedValues).toEqual([
      'rules-1',
      'example.com',
      '/story/',
      0,
      null,
      null,
      '2026-08-01T00:00:00.000Z',
      '2026-08-02T00:00:00.000Z',
    ]);
  });

  it('rejects duplicate scopes and maps persistence failures', async () => {
    database.duplicateRows = [{ id: 'other-rules' }];
    await expectAsync(repository.save(ruleSet())).toBeResolvedTo({
      ok: false,
      reason: 'duplicateScope',
    });

    database.duplicateRows = [];
    database.failRun = true;
    await expectAsync(repository.save(ruleSet())).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
    await expectAsync(repository.delete('rules-1')).toBeResolvedTo({
      ok: false,
      reason: 'persistenceFailed',
    });
  });

  it('deletes a rule set by id', async () => {
    await expectAsync(repository.delete('rules-1')).toBeResolvedTo({ ok: true });

    expect(database.deletedValues).toEqual(['rules-1']);
  });
});

function ruleSet(): ManualChapterNavigationRuleSet {
  return {
    id: 'rules-1',
    scope: { host: 'example.com', pathPrefix: '/story/' },
    enabled: true,
    previous: rule('previous', 'a.prev'),
    next: rule('next', 'a.next'),
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
  };
}

function rule(direction: 'previous' | 'next', selector: string) {
  return {
    direction,
    selectorMode: 'link' as const,
    selector,
    disambiguation: null,
    sampleLabel: direction,
    sampleHref: `https://example.com/${direction}`,
    verifiedAt: '2026-08-02T00:00:00.000Z',
    lastFailedAt: null,
    failureReason: null,
  };
}
