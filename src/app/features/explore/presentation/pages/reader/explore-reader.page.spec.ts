import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ReadingArticleSnapshot } from '../../../domain/reading-article';
import { ExploreBrowserFacade } from '../../../application/explore-browser.facade';
import { ExploreReaderPage } from './explore-reader.page';

const articleSnapshot: ReadingArticleSnapshot = {
  url: 'https://example.com/article',
  title: 'Readable article',
  byline: 'A Writer',
  siteName: 'Example',
  excerpt: 'A short summary.',
  publishedTime: '2026-06-26',
  contentHtml:
    '<p>Readable body.</p><p><a href="/next"><span>Next article</span></a></p><script>window.bad = true;</script>',
  textContent: 'Readable body. Next article',
  length: 27,
  previousChapter: {
    href: '/previous',
    label: 'Previous chapter',
  },
  nextChapter: {
    href: '/next-chapter',
    label: 'Next chapter',
  },
};

class FakeExploreBrowserFacade {
  public readonly readingArticle = signal<ReadingArticleSnapshot | null>(articleSnapshot);
  public readonly chapterNavigationLoading = signal(false);
  public hidden = 0;
  public closed = 0;
  public openedHref: string | null = null;
  public chapterDirection: 'previous' | 'next' | null = null;
  public linkResult = true;
  public chapterDestination: 'reader' | 'browser' = 'reader';

  public hideViewport(): Promise<void> {
    this.hidden += 1;
    return Promise.resolve();
  }

  public closeReadingMode(): Promise<void> {
    this.closed += 1;
    this.readingArticle.set(null);
    return Promise.resolve();
  }

  public openReadingModeLink(href: string): Promise<{ readonly ok: boolean }> {
    this.openedHref = href;
    return Promise.resolve({ ok: this.linkResult });
  }

  public navigateReadingChapter(
    direction: 'previous' | 'next',
  ): Promise<{ readonly ok: true; readonly destination: 'reader' | 'browser' }> {
    this.chapterDirection = direction;
    return Promise.resolve({ ok: true, destination: this.chapterDestination });
  }
}

class FakeRouter {
  public readonly navigations: string[][] = [];

  public navigate(commands: string[]): Promise<boolean> {
    this.navigations.push(commands);
    return Promise.resolve(true);
  }
}

function isIonButtonDisabled(button: Element): boolean {
  return (
    button.hasAttribute('disabled') ||
    ((button as HTMLElement & { readonly disabled?: boolean }).disabled ?? false)
  );
}

describe('ExploreReaderPage', () => {
  let fixture: ComponentFixture<ExploreReaderPage>;
  let browser: FakeExploreBrowserFacade;
  let router: FakeRouter;

  beforeEach(async () => {
    browser = new FakeExploreBrowserFacade();
    router = new FakeRouter();

    await TestBed.configureTestingModule({
      imports: [ExploreReaderPage],
      providers: [
        { provide: ExploreBrowserFacade, useValue: browser },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
  });

  function createPage(): void {
    fixture = TestBed.createComponent(ExploreReaderPage);
    fixture.detectChanges();
  }

  it('hides the native viewport and renders the in-memory article', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(browser.hidden).toBe(1);
    expect(nativeElement.querySelector('h1')?.textContent).toContain('Readable article');
    expect(nativeElement.querySelector('.reader-source')?.textContent).toContain('Example');
    expect(nativeElement.querySelector('time')?.getAttribute('datetime')).toBe('2026-06-26');
    expect(nativeElement.querySelector('time')?.textContent).toContain('Jun 26, 2026');
    expect(nativeElement.querySelector('.reader-excerpt')).toBeNull();
    expect(nativeElement.querySelector('.reader-body')?.textContent).toContain('Readable body.');
    expect(nativeElement.querySelector('.reader-body script')).toBeNull();
  });

  it('falls back to raw published time text when it cannot be parsed', async () => {
    browser.readingArticle.set({
      ...articleSnapshot,
      publishedTime: 'unknown date',
    });

    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('time')?.textContent).toContain('unknown date');
  });

  it('redirects cold reader opens back to Explore', async () => {
    browser.readingArticle.set(null);

    createPage();
    await fixture.whenStable();

    expect(router.navigations).toEqual([['explore']]);
  });

  it('closes reading mode back to the Explore Browser', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const closeButton = nativeElement.querySelectorAll('ion-header ion-button').item(0);
    closeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.closed).toBe(1);
    expect(router.navigations).toEqual([['explore', 'browser']]);
  });

  it('always renders chapter buttons and disables unavailable directions', async () => {
    const nextChapter = articleSnapshot.nextChapter;
    if (nextChapter === undefined) {
      fail('Expected the base article fixture to include a next chapter.');
      return;
    }

    browser.readingArticle.set({
      url: articleSnapshot.url,
      title: articleSnapshot.title,
      byline: articleSnapshot.byline,
      siteName: articleSnapshot.siteName,
      excerpt: articleSnapshot.excerpt,
      publishedTime: articleSnapshot.publishedTime,
      contentHtml: articleSnapshot.contentHtml,
      textContent: articleSnapshot.textContent,
      length: articleSnapshot.length,
      nextChapter,
    });
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const chapterButtons = nativeElement.querySelectorAll('ion-buttons[slot="end"] ion-button');

    expect(chapterButtons.length).toBe(2);
    expect(chapterButtons.item(0).querySelector('ion-icon')?.getAttribute('name')).toBe(
      'chevron-back-outline',
    );
    expect(chapterButtons.item(1).querySelector('ion-icon')?.getAttribute('name')).toBe(
      'chevron-forward-outline',
    );
    expect(isIonButtonDisabled(chapterButtons.item(0))).toBeTrue();
    expect(isIonButtonDisabled(chapterButtons.item(1))).toBeFalse();
  });

  it('shows chapter loading state and disables chapter buttons while loading', async () => {
    browser.chapterNavigationLoading.set(true);
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const chapterButtons = nativeElement.querySelectorAll('ion-buttons[slot="end"] ion-button');

    expect(nativeElement.querySelector('ion-spinner[aria-label="Loading chapter"]')).not.toBeNull();
    expect(isIonButtonDisabled(chapterButtons.item(0))).toBeTrue();
    expect(isIonButtonDisabled(chapterButtons.item(1))).toBeTrue();
  });

  it('navigates chapters through the facade without leaving the reader on replacement', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const nextButton = nativeElement.querySelectorAll('ion-buttons[slot="end"] ion-button').item(1);
    nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.chapterDirection).toBe('next');
    expect(router.navigations).toEqual([]);
  });

  it('routes to the Explore Browser when chapter navigation falls back', async () => {
    browser.chapterDestination = 'browser';
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const previousButton = nativeElement
      .querySelectorAll('ion-buttons[slot="end"] ion-button')
      .item(0);
    previousButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(browser.chapterDirection).toBe('previous');
    expect(router.navigations).toEqual([['explore', 'browser']]);
  });

  it('opens article links through the Explore Browser', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const link = nativeElement.querySelector('.reader-body a');
    link
      ?.querySelector('span')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await fixture.whenStable();

    expect(browser.openedHref).toBe('/next');
    expect(router.navigations).toEqual([['explore', 'browser']]);
  });

  it('stays in the reader when a reader link cannot be opened', async () => {
    browser.linkResult = false;
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    nativeElement.querySelector('.reader-body a')?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();

    expect(browser.openedHref).toBe('/next');
    expect(router.navigations).toEqual([]);
  });

  it('ignores reader body clicks that are not links', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    nativeElement.querySelector('.reader-body')?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();

    expect(browser.openedHref).toBeNull();
    expect(router.navigations).toEqual([]);
  });

  it('ignores reader events that do not start from an element', async () => {
    createPage();
    await fixture.whenStable();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const readerBody = nativeElement.querySelector('.reader-body');
    const text = document.createTextNode('plain text');
    readerBody?.append(text);
    text.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();

    expect(browser.openedHref).toBeNull();
    expect(router.navigations).toEqual([]);
  });
});
