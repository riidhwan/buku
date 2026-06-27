import { Injectable, inject } from '@angular/core';
import { LibraryFacade } from './features/library/application/library.facade';
import {
  ReadingLibrarySavePort,
  ReadingLibrarySeriesOption,
  SaveReadingArticleToLibraryInput,
  SaveReadingArticleToLibraryResult,
} from './features/explore/application/ports/reading-library-save.port';

@Injectable()
export class ReadingLibrarySaveAdapter implements ReadingLibrarySavePort {
  private readonly library = inject(LibraryFacade);

  public async listSeries(): Promise<readonly ReadingLibrarySeriesOption[]> {
    return this.library.listSeries();
  }

  public async save(
    input: SaveReadingArticleToLibraryInput,
  ): Promise<SaveReadingArticleToLibraryResult> {
    const result = await this.library.saveReadingSnapshot({
      snapshot: {
        url: input.article.url,
        title: input.article.title,
        byline: input.article.byline,
        siteName: input.article.siteName,
        publishedTime: input.article.publishedTime,
        contentHtml: input.article.contentHtml,
      },
      entryTitle: input.entryTitle,
      target: input.target,
    });

    switch (result.status) {
      case 'saved':
        return { status: 'saved' };
      case 'duplicate':
        return { status: 'duplicate' };
      case 'validationFailed':
        return { status: 'validationFailed', message: result.message };
      case 'persistenceFailed':
        return { status: 'persistenceFailed' };
    }
  }
}
