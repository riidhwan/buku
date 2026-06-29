import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowRedoOutline,
  arrowUndoOutline,
  checkmarkOutline,
  closeOutline,
  refreshOutline,
  trashOutline,
} from 'ionicons/icons';

export type LibraryEntryEditBlockFormat = 'p' | 'h2' | 'h3';
export type LibraryEntryEditCommand = 'undo' | 'redo' | 'bold' | 'italic';

interface LibraryEntryEditDocumentCommands {
  execCommand(commandId: string, showUI?: boolean, value?: string): boolean;
  queryCommandState(commandId: string): boolean;
}

interface LibraryEntryEditFormattingState {
  readonly boldActive: boolean;
  readonly italicActive: boolean;
  readonly blockFormat: LibraryEntryEditBlockFormat;
}

export function registerLibraryEntryEditIcons(): void {
  addIcons({
    arrowBackOutline,
    arrowRedoOutline,
    arrowUndoOutline,
    checkmarkOutline,
    closeOutline,
    refreshOutline,
    trashOutline,
  });
}

export class LibraryEntryEditFormattingController {
  private savedSelectionRange: Range | null = null;

  public constructor(
    private readonly document: Document,
    private readonly editorBody: () => HTMLElement | undefined,
  ) {}

  public rememberSelection(): void {
    const body = this.editorBody();
    if (body === undefined) {
      return;
    }

    const range = selectionRangeInBody(this.document, body);
    if (range !== null) {
      this.savedSelectionRange = range.cloneRange();
    }
  }

  public runCommand(command: LibraryEntryEditCommand): void {
    this.restoreSelection();
    this.editorBody()?.focus();
    editorDocumentCommands(this.document).execCommand(command);
    this.rememberSelection();
  }

  public setBlockFormat(format: LibraryEntryEditBlockFormat): void {
    this.restoreSelection();
    this.editorBody()?.focus();
    editorDocumentCommands(this.document).execCommand('formatBlock', false, format);
    this.rememberSelection();
  }

  public currentState(): LibraryEntryEditFormattingState | null {
    const body = this.editorBody();
    return body === undefined ? null : currentFormattingState(this.document, body);
  }

  private restoreSelection(): void {
    const body = this.editorBody();
    if (
      body === undefined ||
      !restoreSelectionRange(this.document, body, this.savedSelectionRange)
    ) {
      this.savedSelectionRange = null;
    }
  }
}

function editorDocumentCommands(document: Document): LibraryEntryEditDocumentCommands {
  return document;
}

function selectionRangeInBody(document: Document, body: HTMLElement): Range | null {
  const selection = document.getSelection();
  if (selection === null || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  return body.contains(range.commonAncestorContainer) ? range : null;
}

function restoreSelectionRange(
  document: Document,
  body: HTMLElement,
  range: Range | null,
): boolean {
  const selection = document.getSelection();
  if (selection === null || range === null || !body.contains(range.commonAncestorContainer)) {
    return false;
  }

  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function currentFormattingState(
  document: Document,
  body: HTMLElement,
): LibraryEntryEditFormattingState | null {
  const range = selectionRangeInBody(document, body);
  if (range === null) {
    return null;
  }

  const commands = editorDocumentCommands(document);
  return {
    boldActive: commands.queryCommandState('bold'),
    italicActive: commands.queryCommandState('italic'),
    blockFormat: currentBlockFormat(range),
  };
}

export function draftHtmlWithoutEditorOnlyClasses(body: HTMLElement): string {
  const clone = body.cloneNode(true) as HTMLElement;
  for (const selected of Array.from(clone.querySelectorAll('.library-entry-edit-media-selected'))) {
    selected.classList.remove('library-entry-edit-media-selected');
    if (selected.getAttribute('class') === '') {
      selected.removeAttribute('class');
    }
  }

  return clone.innerHTML;
}

export function mediaElementFromTarget(body: HTMLElement, target: Element): HTMLElement | null {
  const figure = target.closest('figure');
  if (figure instanceof HTMLElement && body.contains(figure)) {
    return figure;
  }

  const image = target.closest('img');
  return image instanceof HTMLElement && body.contains(image) ? image : null;
}

function currentBlockFormat(range: Range): LibraryEntryEditBlockFormat {
  const element = editableAncestor(range);
  const block = element.closest('h2,h3,p,li,div');
  if (block instanceof HTMLHeadingElement && block.tagName === 'H2') {
    return 'h2';
  }

  if (block instanceof HTMLHeadingElement && block.tagName === 'H3') {
    return 'h3';
  }

  return 'p';
}

export function isLibraryEntryEditBlockFormat(value: string): value is LibraryEntryEditBlockFormat {
  return value === 'p' || value === 'h2' || value === 'h3';
}

function editableAncestor(range: Range): Element {
  const container = range.commonAncestorContainer;
  return container instanceof Element ? container : (container.parentElement as Element);
}
