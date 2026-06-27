import { TestBed } from '@angular/core/testing';
import { SQLiteConnection } from '@capacitor-community/sqlite';

import { CAPACITOR_SQLITE_CONNECTION } from './capacitor-sqlite-connection.token';

describe('CAPACITOR_SQLITE_CONNECTION', () => {
  it('creates the default Capacitor SQLite connection', () => {
    const connection = TestBed.inject(CAPACITOR_SQLITE_CONNECTION);

    expect(connection).toBeInstanceOf(SQLiteConnection);
  });
});
