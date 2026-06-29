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

    if (uriAttributes.has(attributeName) && isUnsafeUrl(attribute.value)) {
      element.removeAttribute(attribute.name);
    }
  }
}

function isUnsafeUrl(value: string): boolean {
  const normalized = value
    .trim()
    .replace(/[\u0000-\u001F\u007F\s]+/g, '')
    .toLowerCase();
  return normalized.startsWith('javascript:') || normalized.startsWith('data:text/html');
}

function hasRenderableContent(root: DocumentFragment): boolean {
  if (root.textContent.trim() !== '') {
    return true;
  }

  return root.querySelector('img,video,audio,svg,canvas,hr,br') !== null;
}
