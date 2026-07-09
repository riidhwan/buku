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
    WHERE id = :seriesId;
  `,
  selectSeriesByNormalizedTitle: `
    SELECT id, title, created_at, updated_at
    FROM library_series
    WHERE normalized_title = :normalizedTitle;
  `,
  listSeriesEntries: `
    SELECT id, series_id, display_title, source_host, created_at, updated_at
    FROM library_series_entries
    WHERE series_id = :seriesId
    ORDER BY created_at ASC;
  `,
  selectEntryById: `
    SELECT
      entries.id,
      entries.series_id,
      series.title AS series_title,
      entries.display_title,
      entries.reader_header_visible,
      entries.source_url,
      entries.source_host,
      entries.article_title,
      entries.byline,
      entries.site_name,
      entries.published_time,
      entries.content_html AS original_content_html,
      overrides.content_html AS content_override_html,
      entries.created_at,
      entries.updated_at
    FROM library_series_entries entries
    INNER JOIN library_series series ON series.id = entries.series_id
    LEFT JOIN library_series_entry_content_overrides overrides ON overrides.entry_id = entries.id
    WHERE entries.series_id = :seriesId AND entries.id = :entryId;
  `,
  selectEntryBySourceUrl: `
    SELECT id, series_id, display_title, source_host, created_at, updated_at
    FROM library_series_entries
    WHERE series_id = :seriesId AND source_url = :sourceUrl;
  `,
  insertSeries: `
    INSERT INTO library_series (id, title, normalized_title, created_at, updated_at)
    VALUES (:id, :title, :normalizedTitle, :createdAt, :updatedAt);
  `,
  insertSeriesIgnore: `
    INSERT OR IGNORE INTO library_series (id, title, normalized_title, created_at, updated_at)
    VALUES (:id, :title, :normalizedTitle, :createdAt, :updatedAt);
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
    VALUES (
      :id,
      :seriesId,
      :displayTitle,
      :sourceUrl,
      :sourceHost,
      :articleTitle,
      :byline,
      :siteName,
      :publishedTime,
      :contentHtml,
      :createdAt,
      :updatedAt
    );
  `,
  upsertEntryContentOverride: `
    INSERT INTO library_series_entry_content_overrides (
      entry_id,
      content_html,
      created_at,
      updated_at
    )
    VALUES (
      :entryId,
      :contentHtml,
      :savedAt,
      :savedAt
    )
    ON CONFLICT(entry_id) DO UPDATE SET
      content_html = excluded.content_html,
      updated_at = excluded.updated_at;
  `,
  deleteEntryContentOverride: `
    DELETE FROM library_series_entry_content_overrides
    WHERE entry_id = :entryId;
  `,
  updateEntryHeaderVisibility: `
    UPDATE library_series_entries
    SET reader_header_visible = :headerVisible,
        updated_at = :savedAt
    WHERE series_id = :seriesId AND id = :entryId;
  `,
  updateEntryEditMetadata: `
    UPDATE library_series_entries
    SET display_title = :displayTitle,
        reader_header_visible = :headerVisible,
        updated_at = :savedAt
    WHERE series_id = :seriesId AND id = :entryId;
  `,
} as const;
