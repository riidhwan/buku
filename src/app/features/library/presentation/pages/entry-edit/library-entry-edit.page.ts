import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkOutline, closeOutline } from 'ionicons/icons';
import { LibraryFacade } from '../../../application/library.facade';
import { LibrarySeriesEntry } from '../../../domain/library-series';

type LibraryEntryEditSaveState = 'idle' | 'saving' | 'failed';

@Component({
  selector: 'app-library-entry-edit-page',
  templateUrl: './library-entry-edit.page.html',
  styleUrl: './library-entry-edit.page.scss',
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class LibraryEntryEditPage implements OnInit {
  private readonly library = inject(LibraryFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly seriesId = this.route.snapshot.paramMap.get('seriesId') ?? '';
  protected readonly entryId = this.route.snapshot.paramMap.get('entryId') ?? '';
  protected readonly entry = signal<LibrarySeriesEntry | null>(null);
  protected readonly draftHtml = signal('');
  protected readonly saveState = signal<LibraryEntryEditSaveState>('idle');
  protected readonly validationMessage = signal<string | null>(null);

  @ViewChild('editorBody')
  private readonly editorBody?: ElementRef<HTMLElement>;

  public constructor() {
    addIcons({ checkmarkOutline, closeOutline });
  }

  public ngOnInit(): void {
    void this.loadEntry();
  }

  protected async save(): Promise<void> {
    const contentHtml = this.editorBody?.nativeElement.innerHTML ?? '';
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

  protected cancel(): void {
    void this.navigateToReader();
  }

  private async loadEntry(): Promise<void> {
    const entry = await this.library.getEntry(this.seriesId, this.entryId);
    this.entry.set(entry);
    this.draftHtml.set(entry?.effectiveContentHtml ?? '');
  }

  private navigateToReader(): Promise<boolean> {
    return this.router.navigate(['/library', 'series', this.seriesId, 'entries', this.entryId]);
  }
}
