import { inject, Injectable } from '@angular/core';
import { SQLITE_DATABASE } from '@core/storage/sqlite/sqlite-database.token';
import { SqliteRow } from '@core/storage/sqlite/sqlite-value';
import {
  ManualChapterNavigationRule,
  ManualChapterNavigationRuleSet,
} from '../domain/manual-chapter-navigation-rule';
import {
  ManualChapterNavigationRepositoryResult,
  ManualChapterNavigationRuleRepositoryPort,
} from '../application/ports/manual-chapter-navigation-rule-repository.port';

interface ManualChapterNavigationRuleSetRow extends SqliteRow {
  readonly id: string;
  readonly host: string;
  readonly path_prefix: string | null;
  readonly enabled: number;
  readonly previous_rule_json: string | null;
  readonly next_rule_json: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

@Injectable()
export class SqliteManualChapterNavigationRuleRepositoryAdapter implements ManualChapterNavigationRuleRepositoryPort {
  private readonly database = inject(SQLITE_DATABASE);

  public async list(): Promise<readonly ManualChapterNavigationRuleSet[]> {
    const rows = await this.database.query<ManualChapterNavigationRuleSetRow>(
      `
        SELECT
          id,
          host,
          path_prefix,
          enabled,
          previous_rule_json,
          next_rule_json,
          created_at,
          updated_at
        FROM explore_manual_chapter_navigation_rule_sets
        ORDER BY host ASC, path_prefix ASC
      `,
    );

    return rows.map(toRuleSet);
  }

  public async save(
    ruleSet: ManualChapterNavigationRuleSet,
  ): Promise<ManualChapterNavigationRepositoryResult> {
    try {
      const duplicate = await this.database.query<{ readonly id: string }>(
        `
          SELECT id
          FROM explore_manual_chapter_navigation_rule_sets
          WHERE host = ? AND (
            (path_prefix IS NULL AND ? IS NULL) OR path_prefix = ?
          ) AND id != ?
          LIMIT 1
        `,
        [ruleSet.scope.host, ruleSet.scope.pathPrefix, ruleSet.scope.pathPrefix, ruleSet.id],
      );
      if (duplicate.length > 0) {
        return { ok: false, reason: 'duplicateScope' };
      }

      await this.database.run(
        `
          INSERT INTO explore_manual_chapter_navigation_rule_sets (
            id,
            host,
            path_prefix,
            enabled,
            previous_rule_json,
            next_rule_json,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            host = excluded.host,
            path_prefix = excluded.path_prefix,
            enabled = excluded.enabled,
            previous_rule_json = excluded.previous_rule_json,
            next_rule_json = excluded.next_rule_json,
            updated_at = excluded.updated_at
        `,
        [
          ruleSet.id,
          ruleSet.scope.host,
          ruleSet.scope.pathPrefix,
          ruleSet.enabled ? 1 : 0,
          ruleSet.previous === null ? null : JSON.stringify(ruleSet.previous),
          ruleSet.next === null ? null : JSON.stringify(ruleSet.next),
          ruleSet.createdAt,
          ruleSet.updatedAt,
        ],
      );
      return { ok: true };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async delete(id: string): Promise<ManualChapterNavigationRepositoryResult> {
    try {
      await this.database.run(
        'DELETE FROM explore_manual_chapter_navigation_rule_sets WHERE id = ?',
        [id],
      );
      return { ok: true };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }
}

function toRuleSet(row: ManualChapterNavigationRuleSetRow): ManualChapterNavigationRuleSet {
  return {
    id: row.id,
    scope: {
      host: row.host,
      pathPrefix: row.path_prefix,
    },
    enabled: row.enabled === 1,
    previous: toRule(row.previous_rule_json),
    next: toRule(row.next_rule_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRule(value: string | null): ManualChapterNavigationRule | null {
  return value === null ? null : (JSON.parse(value) as ManualChapterNavigationRule);
}
