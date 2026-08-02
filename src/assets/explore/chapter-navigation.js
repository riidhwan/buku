(function () {
  var namespace = (window.BukuExplore = window.BukuExplore || {});
  var MAX_SELECTOR_LENGTH = 500;
  var MAX_SELECTOR_MATCHES = 50;

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

  function directionalContainerMatches(anchor, direction) {
    var selector =
      direction === 'previous'
        ? '.post-nav-prev,.post-nav-previous,.nav-prev,.nav-previous,.previous-post,.prev-post,.post-prev,.post-previous,.previous-entry,.prev-entry,.chapter-prev,.chapter-previous'
        : '.post-nav-next,.nav-next,.next-post,.post-next,.next-entry,.chapter-next';
    return navLikeContext(anchor) && anchor.closest(selector) !== null;
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

  function visibleAnchorFromElement(element) {
    if (!element) {
      return null;
    }

    var anchor = element.matches && element.matches('a[href]') ? element : null;
    if (!anchor && element.querySelector) {
      var anchors = Array.prototype.slice.call(element.querySelectorAll('a[href]'));
      anchor = anchors.find(isVisibleChapterAnchor) || null;
    }

    return anchor && isVisibleChapterAnchor(anchor) ? anchor : null;
  }

  function selectorMatches(rule) {
    if (!rule || typeof rule.selector !== 'string' || rule.selector.length > MAX_SELECTOR_LENGTH) {
      return { ok: false, reason: 'selectorTooLong', links: [] };
    }

    var elements;
    try {
      elements = Array.prototype.slice.call(document.querySelectorAll(rule.selector));
    } catch (error) {
      return { ok: false, reason: 'invalidSelector', links: [] };
    }

    if (elements.length > MAX_SELECTOR_MATCHES) {
      return { ok: false, reason: 'tooManyMatches', links: [] };
    }

    var anchors =
      rule.selectorMode === 'container'
        ? elements.map(visibleAnchorFromElement).filter(Boolean)
        : elements.filter(function (element) {
            return element.matches && element.matches('a[href]') && isVisibleChapterAnchor(element);
          });

    var links = anchors.map(toChapterLink).filter(Boolean);
    if (links.length === 0) {
      return { ok: false, reason: 'noMatch', links: [] };
    }

    return { ok: true, links: links };
  }

  function linkMatchesDisambiguation(link, disambiguation) {
    if (!disambiguation || !disambiguation.href) {
      return false;
    }

    try {
      return (
        new URL(link.href, document.location.href).toString() ===
        new URL(disambiguation.href, document.location.href).toString()
      );
    } catch (error) {
      return link.href === disambiguation.href;
    }
  }

  function findManualChapterLink(manualChapterNavigation, direction) {
    var rule = manualChapterNavigation && manualChapterNavigation[direction];
    if (!rule) {
      return null;
    }

    var result = selectorMatches(rule);
    if (!result.ok) {
      return null;
    }

    return (
      result.links.find(function (link) {
        return linkMatchesDisambiguation(link, rule.disambiguation);
      }) ||
      result.links[0] ||
      null
    );
  }

  function previewManualChapterNavigation(input) {
    var automatic = input && input.direction ? findChapterLink(input.direction) : null;
    var result = selectorMatches({
      selectorMode: input && input.selectorMode,
      selector: input && input.selector,
      disambiguation:
        input && input.selectedHref ? { href: input.selectedHref, label: null } : null,
    });
    if (!result.ok) {
      return { ok: false, reason: result.reason, matches: result.links, automatic: automatic };
    }

    if (input && input.selectedHref) {
      var includesSelectedHref = result.links.some(function (link) {
        return linkMatchesDisambiguation(link, { href: input.selectedHref, label: null });
      });
      if (!includesSelectedHref) {
        return { ok: false, reason: 'noMatch', matches: result.links, automatic: automatic };
      }
    }

    return {
      ok: true,
      matches: result.links,
      selected: result.links[0] || null,
      automatic: automatic,
    };
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

    var directionalContainerAnchors = anchors.filter(function (anchor) {
      return directionalContainerMatches(anchor, direction);
    });
    if (directionalContainerAnchors.length > 0) {
      return uniqueChapterCandidate(directionalContainerAnchors);
    }

    var bareLabelAnchors = anchors.filter(function (anchor) {
      return navLikeContext(anchor) && labelMatchesDirection(anchor, direction, true);
    });
    return uniqueChapterCandidate(bareLabelAnchors);
  }

  function findChapterLinkWithManual(direction, manualChapterNavigation) {
    return findManualChapterLink(manualChapterNavigation, direction) || findChapterLink(direction);
  }

  namespace.findChapterLink = findChapterLink;
  namespace.findChapterLinkWithManual = findChapterLinkWithManual;
  namespace.previewManualChapterNavigation = previewManualChapterNavigation;
})();
