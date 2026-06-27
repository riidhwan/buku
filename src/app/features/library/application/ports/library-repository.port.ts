import { LibraryDocument } from '../../domain/library-series';

export type LoadLibraryResult =
  | {
      readonly ok: true;
      readonly document: LibraryDocument;
    }
  | {
      readonly ok: false;
      readonly reason: 'persistenceFailed';
    };

export type SaveLibraryDocumentResult =
  | {
      readonly ok: true;
    }
  | {
      readonly ok: false;
      readonly reason: 'persistenceFailed';
    };

export interface LibraryRepository {
  load(): Promise<LoadLibraryResult>;
  save(document: LibraryDocument): Promise<SaveLibraryDocumentResult>;
}
