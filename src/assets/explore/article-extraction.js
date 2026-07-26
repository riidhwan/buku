(function () {
  var namespace = (window.BukuExplore = window.BukuExplore || {});

  function articleFailed(error) {
    return {
      status: 'failed',
      message: error && error.message ? error.message : 'Article extraction failed.',
    };
  }

  function cleanArticleText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function trailingElementChild(element) {
    var child = element.lastChild;
    while (child) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        return child;
      }

      if (child.textContent && child.textContent.trim()) {
        return null;
      }

      child = child.previousSibling;
    }

    return null;
  }

  function navigationLabel(value) {
    var label = cleanArticleText(value).toLowerCase();
    var compactLabel = label.replace(/\s+/g, '');
    if (/^(prev|previous|back|main|index|toc|next)$/.test(compactLabel)) {
      return compactLabel;
    }

    return label;
  }

  function hasNavigationLabel(value) {
    return /^(prev|previous|back|main|index|toc|table of contents|chapter list|next)$/.test(
      navigationLabel(value),
    );
  }

  function isCompactChapterNavigation(element) {
    var text = cleanArticleText(element.textContent);
    if (!text || text.length > 80) {
      return false;
    }

    var anchors = Array.prototype.slice.call(element.querySelectorAll('a[href]'));
    if (anchors.length < 2 || anchors.length > 5) {
      return false;
    }

    var separatorText = anchors.reduce(function (remainingText, anchor) {
      return cleanArticleText(remainingText.replace(cleanArticleText(anchor.textContent), ' '));
    }, text);
    if (separatorText && !/^[|/·•\-–—>><<\s]+$/.test(separatorText)) {
      return false;
    }

    return anchors.every(function (anchor) {
      return hasNavigationLabel(cleanArticleText(anchor.textContent));
    });
  }

  function hasNavigationClass(element) {
    var value = cleanArticleText((element.id || '') + ' ' + (element.className || ''));
    return /\b(nav|navigation|pager|pagination|post-nav|entry-nav|chapter-nav)\b/i.test(value);
  }

  function hasDirectionalNavigationClass(element) {
    var elements = [element].concat(Array.prototype.slice.call(element.querySelectorAll('*')));
    return elements.some(function (candidate) {
      var value = cleanArticleText((candidate.id || '') + ' ' + (candidate.className || ''));
      return /\b(prev|previous|next)\b/i.test(value);
    });
  }

  function isTrailingPostNavigation(element) {
    var text = cleanArticleText(element.textContent);
    if (!text || text.length > 240 || !hasNavigationClass(element)) {
      return false;
    }

    var anchors = Array.prototype.slice.call(element.querySelectorAll('a[href]'));
    if (anchors.length < 1 || anchors.length > 4) {
      return false;
    }

    return /\b(prev|previous|next)\b/i.test(text) || hasDirectionalNavigationClass(element);
  }

  function removeArticleNavigation(container) {
    Array.prototype.slice
      .call(container.querySelectorAll('*'))
      .reverse()
      .forEach(function (element) {
        if (isCompactChapterNavigation(element) || isTrailingPostNavigation(element)) {
          element.parentNode.removeChild(element);
        }
      });
  }

  function removeTrailingEmptyElements(container) {
    var child = trailingElementChild(container);
    while (child) {
      removeTrailingEmptyElements(child);

      if (!cleanArticleText(child.textContent)) {
        child.parentNode.removeChild(child);
        child = trailingElementChild(container);
      } else {
        return;
      }
    }
  }

  function cleanArticleContent(contentHtml) {
    var container = document.createElement('div');
    container.innerHTML = contentHtml || '';
    removeArticleNavigation(container);
    removeTrailingEmptyElements(container);

    return {
      contentHtml: container.innerHTML,
      textContent: cleanArticleText(container.textContent),
    };
  }

  function toSnapshot(article) {
    var previousChapter = namespace.findChapterLink('previous');
    var nextChapter = namespace.findChapterLink('next');
    var content = cleanArticleContent(article.content);
    var snapshot = {
      url: document.location.href,
      title: article.title || document.title || document.location.href,
      byline: article.byline || null,
      siteName: article.siteName || null,
      excerpt: article.excerpt || null,
      publishedTime: article.publishedTime || null,
      contentHtml: content.contentHtml,
      textContent: content.textContent,
      length: content.textContent.length,
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
