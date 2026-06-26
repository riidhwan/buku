import { TestBed } from '@angular/core/testing';
import {
  CAPACITOR_PREFERENCES,
  CapacitorBrowserSessionStoreAdapter,
} from './capacitor-browser-session-store.adapter';

class FakePreferences {
  public readonly values = new Map<string, string>();

  public get(options: { readonly key: string }): Promise<{ readonly value: string | null }> {
    return Promise.resolve({ value: this.values.get(options.key) ?? null });
  }

  public set(options: { readonly key: string; readonly value: string }): Promise<void> {
    this.values.set(options.key, options.value);
    return Promise.resolve();
  }
}

describe('CapacitorBrowserSessionStoreAdapter', () => {
  let adapter: CapacitorBrowserSessionStoreAdapter;
  let preferences: FakePreferences;

  beforeEach(() => {
    preferences = new FakePreferences();
    TestBed.configureTestingModule({
      providers: [
        CapacitorBrowserSessionStoreAdapter,
        { provide: CAPACITOR_PREFERENCES, useValue: preferences },
      ],
    });

    adapter = TestBed.inject(CapacitorBrowserSessionStoreAdapter);
  });

  it('returns null when no last URL is stored', async () => {
    await expectAsync(adapter.readLastUrl()).toBeResolvedTo(null);
  });

  it('writes and reads the last URL', async () => {
    await adapter.writeLastUrl('https://example.com/');

    await expectAsync(adapter.readLastUrl()).toBeResolvedTo('https://example.com/');
  });

  it('wraps Capacitor Preferences in a plain injectable object', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const preferences = TestBed.inject(CAPACITOR_PREFERENCES);
    await preferences.set({ key: 'factory-key', value: 'https://factory.example/' });
    const result = await preferences.get({ key: 'key' });
    const storedResult = await preferences.get({ key: 'factory-key' });

    expect(result.value).toBeNull();
    expect(storedResult.value).toBe('https://factory.example/');
  });
});
