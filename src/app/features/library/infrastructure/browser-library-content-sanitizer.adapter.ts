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

    sanitizeAttributes(element);
  }
}

function sanitizeAttributes(element: Element): void {
  for (const attribute of Array.from(element.attributes)) {
    const attributeName = attribute.name.toLowerCase();
    if (attributeName.startsWith('on') || attributeName === 'style') {
      element.removeAttribute(attribute.name);
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
