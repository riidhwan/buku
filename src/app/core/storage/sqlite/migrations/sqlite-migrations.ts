import { SqliteMigration } from '../sqlite-migration';
import { libraryInitialSchemaMigration } from './0001-library-initial-schema.migration';

export const sqliteMigrations: readonly SqliteMigration[] = [libraryInitialSchemaMigration];
