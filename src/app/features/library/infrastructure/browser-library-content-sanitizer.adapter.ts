import { Injectable } from '@angular/core';
import {
  LibraryContentSanitizer,
  SanitizedLibraryContent,
} from '../application/ports/library-content-sanitizer.port';

const blockedElements = new Set([
  'BASE',
  'BUTTON',
  'EMBED',
  'FORM',
  'IFRAME',
  'INPUT',
  'LINK',
  'META',
  'OBJECT',
  'SCRIPT',
  'SELECT',
  'STYLE',
  'TEXTAREA',
]);

const uriAttributes = new Set(['href', 'src', 'srcset']);
const safeUrlProtocols = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const editorOnlyClasses = new Set(['library-entry-edit-media-selected']);

@Injectable()
export class BrowserLibraryContentSanitizerAdapter implements LibraryContentSanitizer {
  public sanitizeContentHtml(contentHtml: string): SanitizedLibraryContent {
    const template = document.createElement('template');
    template.innerHTML = contentHtml;
    sanitizeNode(template.content);
    return {
      contentHtml: template.innerHTML.trim(),
      hasRenderableContent: hasRenderableContent(template.content),
    };
  }
}

function sanitizeNode(root: ParentNode): void {
  for (const element of Array.from(root.querySelectorAll('*'))) {
    if (blockedElements.has(element.tagName)) {
      element.remove();
      continue;
    }

    const normalizedElement = normalizeEditorFormattingElement(element);
    sanitizeAttributes(normalizedElement);
  }
}

function sanitizeAttributes(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const attributeName = attribute.name.toLowerCase();
    if (attributeName.startsWith('on') || attributeName === 'style') {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (attributeName === 'class') {
      removeEditorOnlyClasses(element);
      continue;
    }

    if (
      uriAttributes.has(attributeName) &&
      !isSafeUrlAttributeValue(attributeName, attribute.value)
    ) {
      element.removeAttribute(attribute.name);
    }
  }
}

function normalizeEditorFormattingElement(element: Element): Element {
  if (element.tagName === 'B') {
    return replaceElementTag(element, 'strong');
  }

  if (element.tagName === 'I') {
    return replaceElementTag(element, 'em');
  }

  return element;
}

function replaceElementTag(element: Element, tagName: 'strong' | 'em'): Element {
  const replacement = document.createElement(tagName);
  for (const attribute of Array.from(element.attributes)) {
    replacement.setAttribute(attribute.name, attribute.value);
  }

  while (element.firstChild !== null) {
    replacement.append(element.firstChild);
  }

  element.replaceWith(replacement);
  return replacement;
}

function removeEditorOnlyClasses(element: Element): void {
  for (const className of editorOnlyClasses) {
    element.classList.remove(className);
  }

  if (element.classList.length === 0) {
    element.removeAttribute('class');
  }
}

function isSafeUrlAttributeValue(attributeName: string, value: string): boolean {
  if (attributeName !== 'srcset') {
    return isSafeUrl(value);
  }

  return value
    .split(',')
    .map((candidate) => firstSrcsetUrl(candidate))
    .every((candidate) => candidate !== '' && isSafeUrl(candidate));
}

function firstSrcsetUrl(candidate: string): string {
  return candidate.trim().split(/\s+/, 1).join('');
}

function isSafeUrl(value: string): boolean {
  const normalized = value.replace(/[\u0000-\u001F\u007F\s]+/g, '').trim();
  if (normalized === '' || normalized.startsWith('#')) {
    return true;
  }

  try {
    return safeUrlProtocols.has(new URL(normalized, document.baseURI).protocol);
  } catch {
    return false;
  }
}

function hasRenderableContent(root: DocumentFragment): boolean {
  if (root.textContent.trim() !== '') {
    return true;
  }

  return root.querySelector('img,video,audio,svg,canvas,hr,br') !== null;
}
