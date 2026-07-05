import { CryptoLibraryIdGeneratorAdapter } from './crypto-library-id-generator.adapter';

describe('CryptoLibraryIdGeneratorAdapter', () => {
  it('creates an ID with the browser crypto API', () => {
    const id = '00000000-0000-4000-8000-000000000000';
    spyOn(crypto, 'randomUUID').and.returnValue(id);

    expect(new CryptoLibraryIdGeneratorAdapter().createId()).toBe(id);
  });
});
