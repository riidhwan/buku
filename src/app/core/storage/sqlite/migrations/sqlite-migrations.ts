import { SqliteMigration } from '../sqlite-migration';
import { libraryInitialSchemaMigration } from './0001-library-initial-schema.migration';
import { librarySeriesEntryContentOverridesMigration } from './0002-library-series-entry-content-overrides.migration';

export const sqliteMigrations: readonly SqliteMigration[] = [
  libraryInitialSchemaMigration,
  librarySeriesEntryContentOverridesMigration,
];
