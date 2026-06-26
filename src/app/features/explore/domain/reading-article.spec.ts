import { ReadingArticleSnapshot } from './reading-article';

const baseArticle: Omit<ReadingArticleSnapshot, 'previousChapter' | 'nextChapter'> = {
  url: 'https://example.com/article',
  title: 'Readable article',
  byline: null,
  siteName: null,
  excerpt: null,
  publishedTime: null,
  contentHtml: '<p>Readable body.</p>',
  textContent: 'Readable body.',
  length: 14,
};

describe('ReadingArticleSnapshot', () => {
  it('supports snapshots without chapter links', () => {
    const article: ReadingArticleSnapshot = baseArticle;

    expect(article.previousChapter).toBeUndefined();
    expect(article.nextChapter).toBeUndefined();
  });

  it('supports snapshots with only a previous chapter link', () => {
    const article: ReadingArticleSnapshot = {
      ...baseArticle,
      previousChapter: {
        href: '/previous',
        label: 'Previous chapter',
      },
    };

    expect(article.previousChapter?.href).toBe('/previous');
    expect(article.nextChapter).toBeUndefined();
  });

  it('supports snapshots with only a next chapter link', () => {
    const article: ReadingArticleSnapshot = {
      ...baseArticle,
      nextChapter: {
        href: '/next',
        label: 'Next chapter',
      },
    };

    expect(article.previousChapter).toBeUndefined();
    expect(article.nextChapter?.href).toBe('/next');
  });

  it('supports snapshots with both chapter links', () => {
    const article: ReadingArticleSnapshot = {
      ...baseArticle,
      previousChapter: {
        href: '/previous',
        label: 'Previous chapter',
      },
      nextChapter: {
        href: '/next',
        label: 'Next chapter',
      },
    };

    expect(article.previousChapter?.label).toBe('Previous chapter');
    expect(article.nextChapter?.label).toBe('Next chapter');
  });
});
