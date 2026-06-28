export const sqliteLibraryStatements = {
  listSeries: `
    SELECT
      series.id,
      series.title,
      COUNT(entries.id) AS entry_count,
      MAX(entries.created_at) AS last_saved_at
    FROM library_series series
    INNER JOIN library_series_entries entries ON entries.series_id = series.id
    GROUP BY series.id, series.title
    ORDER BY last_saved_at DESC;
  `,
  selectSeriesById: `
    SELECT id, title, created_at, updated_at
    FROM library_series
    WHERE id = ?;
  `,
  selectSeriesByNormalizedTitle: `
    SELECT id, title, created_at, updated_at
    FROM library_series
    WHERE normalized_title = ?;
  `,
  listSeriesEntries: `
    SELECT id, series_id, display_title, source_host, created_at, updated_at
    FROM library_series_entries
    WHERE series_id = ?
    ORDER BY created_at ASC;
  `,
  selectEntryById: `
    SELECT
      entries.id,
      entries.series_id,
      series.title AS series_title,
      entries.display_title,
      entries.source_url,
      entries.source_host,
      entries.article_title,
      entries.byline,
      entries.site_name,
      entries.published_time,
      entries.content_html,
      entries.created_at,
      entries.updated_at
    FROM library_series_entries entries
    INNER JOIN library_series series ON series.id = entries.series_id
    WHERE entries.series_id = ? AND entries.id = ?;
  `,
  selectEntryBySourceUrl: `
    SELECT id, series_id, display_title, source_host, created_at, updated_at
    FROM library_series_entries
    WHERE series_id = ? AND source_url = ?;
  `,
  insertSeries: `
    INSERT INTO library_series (id, title, normalized_title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?);
  `,
  insertSeriesIgnore: `
    INSERT OR IGNORE INTO library_series (id, title, normalized_title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?);
  `,
  insertEntry: `
    INSERT INTO library_series_entries (
      id,
      series_id,
      display_title,
      source_url,
      source_host,
      article_title,
      byline,
      site_name,
      published_time,
      content_html,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `,
} as const;
