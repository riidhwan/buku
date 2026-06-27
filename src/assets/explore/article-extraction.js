(function () {
  var namespace = (window.BukuExplore = window.BukuExplore || {});

  function articleFailed(error) {
    return {
      status: 'failed',
      message: error && error.message ? error.message : 'Article extraction failed.',
    };
  }

  function toSnapshot(article) {
    var previousChapter = namespace.findChapterLink('previous');
    var nextChapter = namespace.findChapterLink('next');
    var snapshot = {
      url: document.location.href,
      title: article.title || document.title || document.location.href,
      byline: article.byline || null,
      siteName: article.siteName || null,
      excerpt: article.excerpt || null,
      publishedTime: article.publishedTime || null,
      contentHtml: article.content || '',
      textContent: article.textContent || '',
      length: article.length || (article.textContent || '').length,
    };

    if (previousChapter) {
      snapshot.previousChapter = previousChapter;
    }
    if (nextChapter) {
      snapshot.nextChapter = nextChapter;
    }

    return snapshot;
  }

  function extractArticle() {
    try {
      var clonedDocument = document.cloneNode(true);
      var article = new Readability(clonedDocument).parse();
      if (!article || !article.content || !article.textContent || !article.textContent.trim()) {
        return { status: 'unavailable' };
      }

      return {
        status: 'ok',
        article: toSnapshot(article),
      };
    } catch (error) {
      return articleFailed(error);
    }
  }

  namespace.extractArticle = extractArticle;
})();
