(function () {
  var namespace = (window.BukuExplore = window.BukuExplore || {});

  function cleanChapterText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function hasRel(element, direction) {
    var rel = (element.getAttribute('rel') || '').toLowerCase().split(/\s+/);
    return rel.indexOf(direction === 'previous' ? 'prev' : 'next') !== -1;
  }

  function isVisibleChapterAnchor(anchor) {
    var style = window.getComputedStyle(anchor);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      anchor.getClientRects().length > 0
    );
  }

  function navLikeContext(anchor) {
    var navigationSelector =
      'nav,[role="navigation"],' +
      '.nav,.navigation,.pager,.pagination,.chapter-nav,.chapter-navigation,' +
      '.post-navigation,.entry-navigation,.page-links';
    var context = anchor.closest(navigationSelector);
    if (context) {
      return true;
    }

    var value = '';
    var current = anchor;
    for (var depth = 0; current && depth < 3; depth += 1, current = current.parentElement) {
      value += ' ' + (current.id || '') + ' ' + (current.className || '');
    }

    return /\b(nav|pager|pagination|chapter|prev|previous|next)\b/i.test(value);
  }

  function paginationLikeContext(anchor) {
    var context = anchor.closest('nav,.pager,.pagination,.page-links');
    if (context) {
      var contextText =
        (context.getAttribute('aria-label') || '') + ' ' + (context.getAttribute('title') || '');
      var contextLabel = cleanChapterText(contextText);
      if (/\b(pagination|pages?)\b/i.test(contextLabel)) {
        return true;
      }
    }

    var value = '';
    var current = anchor;
    for (var depth = 0; current && depth < 3; depth += 1, current = current.parentElement) {
      value += ' ' + (current.id || '') + ' ' + (current.className || '');
    }

    return /\b(pager|pagination|page-links)\b/i.test(value);
  }

  function toChapterLink(element) {
    var href = element && element.getAttribute('href');
    if (!href) {
      return null;
    }

    try {
      var absolute = new URL(href, document.location.href);
      if (absolute.protocol !== 'http:' && absolute.protocol !== 'https:') {
        return null;
      }

      var current = new URL(document.location.href);
      current.hash = '';
      absolute.hash = '';
      if (absolute.toString() === current.toString()) {
        return null;
      }
    } catch (error) {
      return null;
    }

    var rawLabel =
      element.getAttribute('title') ||
      element.getAttribute('aria-label') ||
      element.textContent ||
      '';
    var label = cleanChapterText(rawLabel);
    return { href: href, label: label || null };
  }

  function uniqueChapterCandidate(elements) {
    var candidate = null;
    var absoluteHref = null;
    for (var index = 0; index < elements.length; index += 1) {
      var link = toChapterLink(elements[index]);
      if (!link) {
        continue;
      }

      var absolute = new URL(link.href, document.location.href).toString();
      if (absoluteHref !== null && absoluteHref !== absolute) {
        return null;
      }

      absoluteHref = absolute;
      candidate = link;
    }

    return candidate;
  }

  function labelMatchesDirection(anchor, direction, allowBare) {
    var label = cleanChapterText(
      anchor.getAttribute('aria-label') || anchor.getAttribute('title') || anchor.textContent || '',
    ).toLowerCase();

    if (direction === 'previous') {
      return (
        /\b(prev|previous)\s+chapter\b/.test(label) ||
        (allowBare && /^(prev|previous)$/.test(label))
      );
    }

    return /\bnext\s+chapter\b/.test(label) || (allowBare && label === 'next');
  }

  function paginationLabelMatchesDirection(anchor, direction) {
    var label = cleanChapterText(
      anchor.getAttribute('aria-label') || anchor.getAttribute('title') || anchor.textContent || '',
    ).toLowerCase();

    if (direction === 'previous') {
      return /\b(prev|previous)\s+page\b/.test(label);
    }

    return /\bnext\s+page\b/.test(label);
  }

  function visibleAnchors() {
    return Array.prototype.slice
      .call(document.querySelectorAll('a[href]'))
      .filter(isVisibleChapterAnchor);
  }

  function findChapterLink(direction) {
    var relLinks = Array.prototype.slice
      .call(document.querySelectorAll('link[href][rel]'))
      .filter(function (element) {
        return hasRel(element, direction);
      });
    if (relLinks.length > 0) {
      return uniqueChapterCandidate(relLinks);
    }

    var anchors = visibleAnchors();
    var relAnchors = anchors.filter(function (anchor) {
      return hasRel(anchor, direction);
    });
    if (relAnchors.length > 0) {
      return uniqueChapterCandidate(relAnchors);
    }

    var clearLabelAnchors = anchors.filter(function (anchor) {
      return labelMatchesDirection(anchor, direction, false);
    });
    if (clearLabelAnchors.length > 0) {
      return uniqueChapterCandidate(clearLabelAnchors);
    }

    var paginationLabelAnchors = anchors.filter(function (anchor) {
      return paginationLikeContext(anchor) && paginationLabelMatchesDirection(anchor, direction);
    });
    if (paginationLabelAnchors.length > 0) {
      return uniqueChapterCandidate(paginationLabelAnchors);
    }

    var bareLabelAnchors = anchors.filter(function (anchor) {
      return navLikeContext(anchor) && labelMatchesDirection(anchor, direction, true);
    });
    return uniqueChapterCandidate(bareLabelAnchors);
  }

  namespace.findChapterLink = findChapterLink;
})();
