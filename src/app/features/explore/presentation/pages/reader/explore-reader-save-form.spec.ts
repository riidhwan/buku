import { ExploreReaderSaveForm } from './explore-reader-save-form';

const existingSeries = [
  {
    id: 'series-1',
    title: 'Existing Series',
    entryCount: 2,
    lastSavedAt: '2026-06-26T10:00:00.000Z',
  },
  {
    id: 'series-2',
    title: 'Other Series',
    entryCount: 1,
    lastSavedAt: '2026-06-25T10:00:00.000Z',
  },
] as const;

describe('ExploreReaderSaveForm', () => {
  let form: ExploreReaderSaveForm;

  beforeEach(() => {
    form = new ExploreReaderSaveForm();
    form.resetForArticle({
      rememberedSeriesTitle: null,
      entryTitle: 'Readable article',
      existingSeries,
    });
  });

  it('normalizes nullish field updates and clears errors', () => {
    form.error.set('Previous error');
    form.selectSeries(existingSeries[0]);

    form.updateSeriesInput(null);
    form.updateEntryTitle(undefined);

    expect(form.seriesInput).toBe('');
    expect(form.entryTitleInput).toBe('');
    expect(form.selectedSeriesId).toBeNull();
    expect(form.error()).toBeNull();
    expect(form.canSave()).toBeFalse();
  });

  it('filters Series and shows create affordance only when there is no exact match', () => {
    form.updateSeriesInput('');

    expect(form.filteredSeries()).toEqual(existingSeries);

    form.updateSeriesInput('existing');

    expect(form.filteredSeries()).toEqual([existingSeries[0]]);
    expect(form.showCreateSeries()).toBeTrue();

    form.updateSeriesInput(' existing   series ');

    expect(form.showCreateSeries()).toBeFalse();
    expect(form.seriesTarget()).toEqual({ kind: 'existing', seriesId: 'series-1' });
  });

  it('builds explicit existing and new title targets', () => {
    form.selectSeries(existingSeries[1]);

    expect(form.seriesTarget()).toEqual({ kind: 'existing', seriesId: 'series-2' });

    form.updateSeriesInput('New Series');

    expect(form.seriesTarget()).toEqual({ kind: 'title', title: 'New Series' });
  });

  it('keeps the modal open while saving and closes it afterwards', () => {
    form.saving.set(true);

    form.close();

    expect(form.modalOpen()).toBeTrue();

    form.saving.set(false);
    form.close();

    expect(form.modalOpen()).toBeFalse();
  });

  it('maps save results to confirmation and user-facing errors', () => {
    form.handleSaveResult({ status: 'saved' });

    expect(form.modalOpen()).toBeFalse();
    expect(form.confirmed()).toBeTrue();

    form.handleSaveResult({ status: 'duplicate' });
    expect(form.error()).toBe('This article is already saved in that Series.');

    form.handleSaveResult({ status: 'validationFailed', message: 'Custom validation.' });
    expect(form.error()).toBe('Custom validation.');

    form.handleSaveResult({ status: 'validationFailed' });
    expect(form.error()).toBe('Series and entry title are required.');

    form.handleSaveResult({ status: 'persistenceFailed' });
    expect(form.error()).toBe('Library could not save this article. Try again.');
  });
});
