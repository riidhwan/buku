import { InjectionToken } from '@angular/core';

import { SqliteDatabase } from './sqlite-database';

export const SQLITE_DATABASE = new InjectionToken<SqliteDatabase>('SQLITE_DATABASE');
