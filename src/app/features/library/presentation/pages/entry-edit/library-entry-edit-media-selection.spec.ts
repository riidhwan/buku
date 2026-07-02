import { LibraryEntryEditMediaSelection } from './library-entry-edit-media-selection';

describe('LibraryEntryEditMediaSelection', () => {
  it('selects figure media from an event target and clears the previous selection', () => {
    const body = document.createElement('section');
    body.innerHTML = `
      <figure><img src="https://example.test/a.jpg"></figure>
      <p>Text</p>
      <img src="https://example.test/b.jpg">
    `;
    const figure = requiredElement(body, 'figure');
    const figureImage = requiredElement(figure, 'img');
    const standaloneImage = requiredElement(body, 'section > img');
    const selection = new LibraryEntryEditMediaSelection();

    selection.selectFromEvent(body, eventWithTarget(figureImage));

    expect(selection.selected()).toBeTrue();
    expect(figure.classList.contains('library-entry-edit-media-selected')).toBeTrue();

    selection.selectFromEvent(body, eventWithTarget(standaloneImage));

    expect(selection.selected()).toBeTrue();
    expect(figure.classList.contains('library-entry-edit-media-selected')).toBeFalse();
    expect(standaloneImage.classList.contains('library-entry-edit-media-selected')).toBeTrue();
  });

  it('clears selected media when the target is not selectable media', () => {
    const body = document.createElement('section');
    body.innerHTML = '<img src="https://example.test/a.jpg"><p>Text</p>';
    const image = requiredElement(body, 'img');
    const paragraph = requiredElement(body, 'p');
    const selection = new LibraryEntryEditMediaSelection();

    selection.selectFromEvent(body, eventWithTarget(image));
    selection.selectFromEvent(body, eventWithTarget(paragraph));

    expect(selection.selected()).toBeFalse();
    expect(image.classList.contains('library-entry-edit-media-selected')).toBeFalse();
  });

  it('deletes the selected media element', () => {
    const body = document.createElement('section');
    body.innerHTML = '<p>Text</p><img src="https://example.test/a.jpg">';
    const image = requiredElement(body, 'img');
    const selection = new LibraryEntryEditMediaSelection();

    selection.selectFromEvent(body, eventWithTarget(image));
    selection.deleteSelected();

    expect(selection.selected()).toBeFalse();
    expect(body.querySelector('img')).toBeNull();
  });

  it('returns draft HTML without editor-only selected media classes', () => {
    const body = document.createElement('section');
    body.innerHTML = `
      <p>Text</p>
      <img class="library-entry-edit-media-selected" src="https://example.test/a.jpg">
      <figure class="kept library-entry-edit-media-selected">
        <img src="https://example.test/b.jpg">
      </figure>
    `;
    const selection = new LibraryEntryEditMediaSelection();

    expect(selection.draftHtml(body)).toContain('<img src="https://example.test/a.jpg">');
    expect(selection.draftHtml(body)).toContain('<figure class="kept">');
    expect(selection.draftHtml(undefined)).toBe('');
  });

  it('ignores events without an editor body or element target', () => {
    const body = document.createElement('section');
    body.innerHTML = '<img src="https://example.test/a.jpg">';
    const image = requiredElement(body, 'img');
    const selection = new LibraryEntryEditMediaSelection();

    selection.selectFromEvent(undefined, eventWithTarget(image));
    selection.selectFromEvent(body, new Event('click'));

    expect(selection.selected()).toBeFalse();
  });
});

function requiredElement(root: ParentNode, selector: string): HTMLElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected ${selector}.`);
  }

  return element;
}

function eventWithTarget(target: EventTarget): Event {
  const event = new Event('click', { bubbles: true });
  Object.defineProperty(event, 'target', { value: target });
  return event;
}
