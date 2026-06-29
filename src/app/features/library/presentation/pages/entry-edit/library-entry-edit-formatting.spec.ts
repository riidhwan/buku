import {
  LibraryEntryEditFormattingController,
  isLibraryEntryEditBlockFormat,
  mediaElementFromTarget,
} from './library-entry-edit-formatting';

describe('library entry edit formatting helpers', () => {
  afterEach(() => {
    document.getSelection()?.removeAllRanges();
  });

  it('ignores selection memory when the editor body is unavailable', () => {
    const execCommand = spyOn(document, 'execCommand').and.returnValue(true);
    const controller = new LibraryEntryEditFormattingController(document, () => undefined);

    controller.rememberSelection();
    controller.runCommand('bold');

    expect(execCommand).toHaveBeenCalledOnceWith('bold');
    expect(controller.currentState()).toBeNull();
  });

  it('reports no selection when the document selection is empty or outside the editor', () => {
    const body = document.createElement('section');
    const outside = document.createElement('p');
    outside.textContent = 'Outside';
    document.body.append(body, outside);
    document.getSelection()?.removeAllRanges();

    const controller = new LibraryEntryEditFormattingController(document, () => body);
    const noSelectionController = new LibraryEntryEditFormattingController(
      documentWithoutSelection(),
      () => body,
    );

    expect(controller.currentState()).toBeNull();
    expect(noSelectionController.currentState()).toBeNull();
    selectContents(outside);

    expect(controller.currentState()).toBeNull();

    body.remove();
    outside.remove();
  });

  it('detects unordered lists and heading two blocks', () => {
    const body = document.createElement('section');
    body.innerHTML = '<p>Paragraph</p><ul><li><h2>Heading</h2></li></ul>';
    document.body.append(body);
    const paragraph = requiredElement(body, 'p');
    const heading = requiredElement(body, 'h2');
    const controller = new LibraryEntryEditFormattingController(document, () => body);

    selectContents(paragraph);
    expect(controller.currentState()).toEqual(
      jasmine.objectContaining({
        blockFormat: 'p',
      }),
    );

    selectContents(heading);
    expect(controller.currentState()).toEqual(
      jasmine.objectContaining({
        blockFormat: 'h2',
      }),
    );

    body.remove();
  });

  it('handles invalid ancestors and block style values', () => {
    const body = document.createElement('section');
    const outside = document.createElement('p');
    outside.textContent = 'Outside';
    document.body.append(body, outside);
    selectContents(outside);
    const controller = new LibraryEntryEditFormattingController(document, () => body);

    expect(controller.currentState()).toBeNull();
    expect(isLibraryEntryEditBlockFormat('h3')).toBeTrue();
    expect(isLibraryEntryEditBlockFormat('h4')).toBeFalse();

    body.remove();
    outside.remove();
  });

  it('finds direct images and ignores media outside the editor body', () => {
    const body = document.createElement('section');
    body.innerHTML = '<p>Body</p><img src="https://example.test/a.jpg">';
    const outsideImage = document.createElement('img');
    document.body.append(body, outsideImage);

    expect(mediaElementFromTarget(body, requiredElement(body, 'img'))).toBe(
      requiredElement(body, 'img'),
    );
    expect(mediaElementFromTarget(body, outsideImage)).toBeNull();

    body.remove();
    outsideImage.remove();
  });
});

function selectContents(element: Element): void {
  const selection = document.getSelection();
  if (selection === null) {
    throw new Error('Expected document selection.');
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
}

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected ${selector}.`);
  }

  return element;
}

function documentWithoutSelection(): Document {
  const documentWithoutSelection = Object.create(document) as Document;
  Object.defineProperty(documentWithoutSelection, 'getSelection', { value: () => null });
  return documentWithoutSelection;
}
