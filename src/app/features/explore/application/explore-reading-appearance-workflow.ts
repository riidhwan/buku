import { signal } from '@angular/core';
import {
  defaultReadingAppearance,
  ReadingColorSchemeId,
  ReadingFontId,
} from '../../../shared/domain/reading-appearance';
import { ReadingAppearanceStore } from '../../../shared/application/reading-appearance-store.port';

export class ExploreReadingAppearanceWorkflow {
  public readonly appearance = signal(defaultReadingAppearance);

  public constructor(
    private readonly dependencies: {
      readonly appearanceStore: ReadingAppearanceStore;
    },
  ) {}

  public async loadAppearance(): Promise<void> {
    this.appearance.set(await this.dependencies.appearanceStore.readAppearance());
  }

  public async selectFont(fontId: ReadingFontId): Promise<void> {
    const appearance = { ...this.appearance(), fontId };
    this.appearance.set(appearance);
    await this.dependencies.appearanceStore.saveAppearance(appearance);
  }

  public async selectColorScheme(colorSchemeId: ReadingColorSchemeId): Promise<void> {
    const appearance = { ...this.appearance(), colorSchemeId };
    this.appearance.set(appearance);
    await this.dependencies.appearanceStore.saveAppearance(appearance);
  }
}
