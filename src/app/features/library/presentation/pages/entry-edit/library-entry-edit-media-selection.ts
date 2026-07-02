import { signal } from '@angular/core';
import {
  draftHtmlWithoutEditorOnlyClasses,
  mediaElementFromTarget,
} from './library-entry-edit-formatting';

export class LibraryEntryEditMediaSelection {
  public readonly selected = signal(false);

  private selectedElement: HTMLElement | null = null;

  public selectFromEvent(body: HTMLElement | undefined, event: Event): void {
    const target = event.target;
    if (!(target instanceof Element) || body === undefined) {
      return;
    }

    const mediaElement = mediaElementFromTarget(body, target);
    if (mediaElement === null) {
      this.clear();
      return;
    }

    this.clear();
    mediaElement.classList.add('library-entry-edit-media-selected');
    this.selectedElement = mediaElement;
    this.selected.set(true);
  }

  public deleteSelected(): void {
    this.selectedElement?.remove();
    this.selectedElement = null;
    this.selected.set(false);
  }

  public draftHtml(body: HTMLElement | undefined): string {
    return body === undefined ? '' : draftHtmlWithoutEditorOnlyClasses(body);
  }

  private clear(): void {
    this.selectedElement?.classList.remove('library-entry-edit-media-selected');
    this.selectedElement = null;
    this.selected.set(false);
  }
}
