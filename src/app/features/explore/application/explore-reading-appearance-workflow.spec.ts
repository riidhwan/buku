import { ReadingAppearance } from '../../../shared/domain/reading-appearance';
import { ExploreReadingAppearanceWorkflow } from './explore-reading-appearance-workflow';

describe('ExploreReadingAppearanceWorkflow', () => {
  let store: FakeReadingAppearanceStore;
  let workflow: ExploreReadingAppearanceWorkflow;

  beforeEach(() => {
    store = new FakeReadingAppearanceStore();
    workflow = new ExploreReadingAppearanceWorkflow({ appearanceStore: store });
  });

  it('loads the persisted reading appearance', async () => {
    store.appearance = { fontId: 'libron', colorSchemeId: 'sepia' };

    await workflow.loadAppearance();

    expect(workflow.appearance()).toEqual({ fontId: 'libron', colorSchemeId: 'sepia' });
  });

  it('persists selected reader fonts immediately', async () => {
    store.appearance = { fontId: 'nv-charis', colorSchemeId: 'dark' };
    await workflow.loadAppearance();

    await workflow.selectFont('sourcerer');

    expect(workflow.appearance()).toEqual({ fontId: 'sourcerer', colorSchemeId: 'dark' });
    expect(store.savedAppearances).toEqual([{ fontId: 'sourcerer', colorSchemeId: 'dark' }]);
  });

  it('persists selected reader color schemes immediately', async () => {
    store.appearance = { fontId: 'libron', colorSchemeId: 'system' };
    await workflow.loadAppearance();

    await workflow.selectColorScheme('paper');

    expect(workflow.appearance()).toEqual({ fontId: 'libron', colorSchemeId: 'paper' });
    expect(store.savedAppearances).toEqual([{ fontId: 'libron', colorSchemeId: 'paper' }]);
  });
});

class FakeReadingAppearanceStore {
  public appearance: ReadingAppearance = {
    fontId: 'nv-charis',
    colorSchemeId: 'system',
  };
  public readonly savedAppearances: ReadingAppearance[] = [];

  public readAppearance(): Promise<ReadingAppearance> {
    return Promise.resolve(this.appearance);
  }

  public saveAppearance(appearance: ReadingAppearance): Promise<void> {
    this.appearance = appearance;
    this.savedAppearances.push(appearance);
    return Promise.resolve();
  }
}
