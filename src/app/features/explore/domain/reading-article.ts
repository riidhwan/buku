export interface ReadingChapterLink {
  readonly href: string;
  readonly label: string | null;
}

export interface ReadingArticleSnapshot {
  readonly url: string;
  readonly title: string;
  readonly byline: string | null;
  readonly siteName: string | null;
  readonly excerpt: string | null;
  readonly publishedTime: string | null;
  readonly contentHtml: string;
  readonly textContent: string;
  readonly length: number;
  readonly previousChapter?: ReadingChapterLink;
  readonly nextChapter?: ReadingChapterLink;
}
