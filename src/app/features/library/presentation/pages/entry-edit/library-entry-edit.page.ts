import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonText,
  IonTitle,
  IonToolbar,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkOutline,
  closeOutline,
  refreshOutline,
  trashOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { LibraryFacade } from '../../../application/library.facade';
import { LIBRARY_CONTENT_SANITIZER } from '../../../application/ports/library-content-sanitizer.port';
import { LibrarySeriesEntry } from '../../../domain/library-series';

type LibraryEntryEditSaveState = 'idle' | 'saving' | 'resetting' | 'failed';

@Component({
  selector: 'app-library-entry-edit-page',
  templateUrl: './library-entry-edit.page.html',
  styleUrl: './library-entry-edit.page.scss',
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonText, IonTitle, IonToolbar],
})
export class LibraryEntryEditPage implements OnInit, OnDestroy {
  private readonly library = inject(LibraryFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly platform = inject(Platform);
  private readonly sanitizer = inject(LIBRARY_CONTENT_SANITIZER);

  protected readonly seriesId = this.route.snapshot.paramMap.get('seriesId') ?? '';
  protected readonly entryId = this.route.snapshot.paramMap.get('entryId') ?? '';
  protected readonly entry = signal<LibrarySeriesEntry | null>(null);
  protected readonly draftHtml = signal('');
  protected readonly saveState = signal<LibraryEntryEditSaveState>('idle');
  protected readonly validationMessage = signal<string | null>(null);
  protected readonly selectedMedia = signal(false);

  @ViewChild('editorBody')
  private readonly editorBody?: ElementRef<HTMLElement>;
  private selectedMediaElement: HTMLElement | null = null;
  private startingSanitizedHtml = '';
  private backButtonSubscription: Subscription | null = null;

  public constructor() {
    addIcons({ arrowBackOutline, checkmarkOutline, closeOutline, refreshOutline, trashOutline });
  }

  public ngOnInit(): void {
    this.registerBackButtonHandler();
    void this.loadEntry();
  }

  public ngOnDestroy(): void {
    this.backButtonSubscription?.unsubscribe();
    this.backButtonSubscription = null;
  }

  protected async save(): Promise<void> {
    const contentHtml = this.currentDraftHtml();
    this.saveState.set('saving');
    this.validationMessage.set(null);

    const result = await this.library.saveSeriesEntryContentOverride({
      seriesId: this.seriesId,
      entryId: this.entryId,
      contentHtml,
    });
    if (result.status === 'saved') {
      await this.navigateToReader();
      return;
    }

    this.saveState.set('failed');
    this.validationMessage.set(
      result.status === 'validationFailed' ? result.message : 'Could not save this edit.',
    );
  }

  protected async resetToOriginal(): Promise<void> {
    if (!(await this.confirmReset())) {
      return;
    }

    this.saveState.set('resetting');
    this.validationMessage.set(null);
    const result = await this.library.resetSeriesEntryContentOverride({
      seriesId: this.seriesId,
      entryId: this.entryId,
    });
    if (result.status === 'reset') {
      await this.navigateToReader();
      return;
    }

    this.saveState.set('failed');
    this.validationMessage.set('Could not reset this edit.');
  }

  protected cancel(): void {
    void this.requestLeave();
  }

  protected back(): void {
    void this.requestLeave();
  }

  protected selectMedia(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const mediaElement = this.mediaElementFromTarget(target);
    if (mediaElement === null) {
      this.clearSelectedMedia();
      return;
    }

    this.clearSelectedMedia();
    mediaElement.classList.add('library-entry-edit-media-selected');
    this.selectedMediaElement = mediaElement;
    this.selectedMedia.set(true);
  }

  protected deleteSelectedMedia(): void {
    this.selectedMediaElement?.remove();
    this.selectedMediaElement = null;
    this.selectedMedia.set(false);
  }

  private async loadEntry(): Promise<void> {
    const entry = await this.library.getEntry(this.seriesId, this.entryId);
    this.entry.set(entry);
    const contentHtml = entry?.effectiveContentHtml ?? '';
    this.startingSanitizedHtml = this.sanitizeForComparison(contentHtml);
    this.draftHtml.set(contentHtml);
  }

  private async requestLeave(): Promise<void> {
    if (this.hasUnsavedChanges() && !(await this.confirmDiscard())) {
      return;
    }

    await this.navigateToReader();
  }

  private navigateToReader(): Promise<boolean> {
    return this.router.navigate(['/library', 'series', this.seriesId, 'entries', this.entryId]);
  }

  private registerBackButtonHandler(): void {
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      void this.requestLeave();
    });
  }

  private currentDraftHtml(): string {
    const body = this.editorBody?.nativeElement;
    if (body === undefined) {
      return '';
    }

    const clone = body.cloneNode(true) as HTMLElement;
    for (const selected of Array.from(
      clone.querySelectorAll('.library-entry-edit-media-selected'),
    )) {
      selected.classList.remove('library-entry-edit-media-selected');
      if (selected.getAttribute('class') === '') {
        selected.removeAttribute('class');
      }
    }
    return clone.innerHTML;
  }

  private hasUnsavedChanges(): boolean {
    return this.sanitizeForComparison(this.currentDraftHtml()) !== this.startingSanitizedHtml;
  }

  private sanitizeForComparison(contentHtml: string): string {
    return this.sanitizer.sanitizeContentHtml(contentHtml).contentHtml;
  }

  private mediaElementFromTarget(target: Element): HTMLElement | null {
    const body = this.editorBody?.nativeElement;
    if (body === undefined) {
      return null;
    }

    const figure = target.closest('figure');
    if (figure instanceof HTMLElement && body.contains(figure)) {
      return figure;
    }

    const image = target.closest('img');
    return image instanceof HTMLElement && body.contains(image) ? image : null;
  }

  private clearSelectedMedia(): void {
    this.selectedMediaElement?.classList.remove('library-entry-edit-media-selected');
    this.selectedMediaElement = null;
    this.selectedMedia.set(false);
  }

  private async confirmReset(): Promise<boolean> {
    return this.confirm({
      header: 'Reset to original?',
      message: 'This deletes your current edit and restores the saved snapshot.',
      confirmText: 'Reset',
    });
  }

  private async confirmDiscard(): Promise<boolean> {
    return this.confirm({
      header: 'Discard changes?',
      message: 'Your unsaved edits will be lost.',
      confirmText: 'Discard',
    });
  }

  private async confirm(options: {
    readonly header: string;
    readonly message: string;
    readonly confirmText: string;
  }): Promise<boolean> {
    let confirmed = false;
    const alert = await this.alertController.create({
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
