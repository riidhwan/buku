import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { LibraryFacade } from '../../../application/library.facade';
import { LibraryContentSanitizer } from '../../../application/ports/library-content-sanitizer.port';
import { LibrarySeriesEntry } from '../../../domain/library-series';

export type LibraryEntryEditSaveState = 'idle' | 'saving' | 'resetting' | 'failed';

export class LibraryEntryEditWorkflow {
  public readonly entry = signal<LibrarySeriesEntry | null>(null);
  public readonly draftHtml = signal('');
  public readonly draftHeaderVisible = signal(true);
  public readonly saveState = signal<LibraryEntryEditSaveState>('idle');
  public readonly validationMessage = signal<string | null>(null);

  private startingSanitizedHtml = '';
  private startingHeaderVisible = true;

  public constructor(
    private readonly dependencies: {
      readonly library: LibraryFacade;
      readonly router: Router;
      readonly alertController: AlertController;
      readonly sanitizer: LibraryContentSanitizer;
      readonly seriesId: string;
      readonly entryId: string;
    },
  ) {}

  public async loadEntry(): Promise<void> {
    const entry = await this.dependencies.library.getEntry(
      this.dependencies.seriesId,
      this.dependencies.entryId,
    );
    this.entry.set(entry);
    const contentHtml = entry?.effectiveContentHtml ?? '';
    this.startingHeaderVisible = entry?.headerVisible ?? true;
    this.startingSanitizedHtml = this.sanitizeForComparison(contentHtml);
    this.draftHtml.set(contentHtml);
    this.draftHeaderVisible.set(this.startingHeaderVisible);
  }

  public async save(contentHtml: string, headerVisible: boolean): Promise<boolean> {
    this.saveState.set('saving');
    this.validationMessage.set(null);

    if (this.hasUnsavedContentChanges(contentHtml)) {
      const result = await this.dependencies.library.saveSeriesEntryContentOverride({
        seriesId: this.dependencies.seriesId,
        entryId: this.dependencies.entryId,
        contentHtml,
      });
      if (result.status !== 'saved') {
        this.saveState.set('failed');
        this.validationMessage.set(
          result.status === 'validationFailed' ? result.message : 'Could not save this edit.',
        );
        return false;
      }
    }

    if (this.hasUnsavedHeaderVisibilityChanges(headerVisible)) {
      const result = await this.dependencies.library.saveSeriesEntryHeaderVisibility({
        seriesId: this.dependencies.seriesId,
        entryId: this.dependencies.entryId,
        headerVisible,
      });
      if (result.status !== 'saved') {
        this.saveState.set('failed');
        this.validationMessage.set('Could not save this edit.');
        return false;
      }
    }

    await this.navigateToReader();
    return true;
  }

  public async resetToOriginal(): Promise<boolean> {
    if (
      !(await this.confirm({
        header: 'Reset to original?',
        message: 'This deletes your current edit and restores the saved snapshot.',
        confirmText: 'Reset',
      }))
    ) {
      return false;
    }

    this.saveState.set('resetting');
    this.validationMessage.set(null);
    const result = await this.dependencies.library.resetSeriesEntryContentOverride({
      seriesId: this.dependencies.seriesId,
      entryId: this.dependencies.entryId,
    });
    if (result.status === 'reset') {
      await this.navigateToReader();
      return true;
    }

    this.saveState.set('failed');
    this.validationMessage.set('Could not reset this edit.');
    return false;
  }

  public async requestLeave(currentDraftHtml: string, headerVisible: boolean): Promise<boolean> {
    if (
      this.hasUnsavedChanges(currentDraftHtml, headerVisible) &&
      !(await this.confirm({
        header: 'Discard changes?',
        message: 'Your unsaved edits will be lost.',
        confirmText: 'Discard',
      }))
    ) {
      return false;
    }

    await this.navigateToReader();
    return true;
  }

  private navigateToReader(): Promise<boolean> {
    return this.dependencies.router.navigate([
      '/library',
      'series',
      this.dependencies.seriesId,
      'entries',
      this.dependencies.entryId,
    ]);
  }

  private hasUnsavedChanges(contentHtml: string, headerVisible: boolean): boolean {
    return (
      this.hasUnsavedContentChanges(contentHtml) ||
      this.hasUnsavedHeaderVisibilityChanges(headerVisible)
    );
  }

  private hasUnsavedContentChanges(contentHtml: string): boolean {
    return this.sanitizeForComparison(contentHtml) !== this.startingSanitizedHtml;
  }

  private hasUnsavedHeaderVisibilityChanges(headerVisible: boolean): boolean {
    return headerVisible !== this.startingHeaderVisible;
  }

  private sanitizeForComparison(contentHtml: string): string {
    return this.dependencies.sanitizer.sanitizeContentHtml(contentHtml).contentHtml;
  }

  private async confirm(options: {
    readonly header: string;
    readonly message: string;
    readonly confirmText: string;
  }): Promise<boolean> {
    let confirmed = false;
    const alert = await this.dependencies.alertController.create({
      header: options.header,
      message: options.message,
      buttons: [
        { text: 'Keep editing', role: 'cancel' },
        {
          text: options.confirmText,
          role: 'destructive',
          handler: () => {
            confirmed = true;
          },
        },
      ],
    });
    await alert.present();
    await alert.onDidDismiss();
    return confirmed;
  }
}
