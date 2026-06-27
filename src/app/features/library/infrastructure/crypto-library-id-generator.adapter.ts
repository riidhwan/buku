import { Injectable } from '@angular/core';
import { LibraryIdGenerator } from '../application/ports/library-id-generator.port';

@Injectable()
export class CryptoLibraryIdGeneratorAdapter implements LibraryIdGenerator {
  public createId(): string {
    return crypto.randomUUID();
  }
}
