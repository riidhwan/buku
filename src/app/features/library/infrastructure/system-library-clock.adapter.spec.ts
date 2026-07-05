import { SystemLibraryClockAdapter } from './system-library-clock.adapter';

describe('SystemLibraryClockAdapter', () => {
  it('returns the current time as an ISO string', () => {
    const timestamp = new SystemLibraryClockAdapter().now();

    expect(Number.isNaN(Date.parse(timestamp))).toBeFalse();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
