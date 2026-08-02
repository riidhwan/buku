import { SqliteMigration } from '../sqlite-migration';

export const exploreManualChapterNavigationRulesMigration: SqliteMigration = {
  version: 4,
  statements: [
    `
      CREATE TABLE explore_manual_chapter_navigation_rule_sets (
        id TEXT PRIMARY KEY NOT NULL,
        host TEXT NOT NULL,
        path_prefix TEXT,
        enabled INTEGER NOT NULL,
        previous_rule_json TEXT,
        next_rule_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(host, path_prefix)
      );
    `,
    `
      CREATE UNIQUE INDEX explore_manual_chapter_navigation_host_scope
      ON explore_manual_chapter_navigation_rule_sets(host)
      WHERE path_prefix IS NULL;
    `,
  ],
};
