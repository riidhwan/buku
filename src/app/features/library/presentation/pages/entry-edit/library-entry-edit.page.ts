import { DOCUMENT } from '@angular/common';
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
import { Subscription } from 'rxjs';
import { LibraryFacade } from '../../../application/library.facade';
import { LIBRARY_CONTENT_SANITIZER } from '../../../application/ports/library-content-sanitizer.port';
import {
  LibraryEntryEditBlockFormat,
  LibraryEntryEditCommand,
  LibraryEntryEditFormattingController,
  registerLibraryEntryEditIcons,
} from './library-entry-edit-formatting';
import { LibraryEntryEditMediaSelection } from './library-entry-edit-media-selection';
import { LibraryEntryEditWorkflow } from './library-entry-edit-workflow';

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
  private readonly document = inject(DOCUMENT);

  protected readonly seriesId = this.route.snapshot.paramMap.get('seriesId') ?? '';
  protected readonly entryId = this.route.snapshot.paramMap.get('entryId') ?? '';
  private readonly workflow = new LibraryEntryEditWorkflow({
    library: this.library,
    router: this.router,
    alertController: this.alertController,
    sanitizer: this.sanitizer,
    seriesId: this.seriesId,
    entryId: this.entryId,
  });
  protected readonly entry = this.workflow.entry;
  protected readonly draftHtml = this.workflow.draftHtml;
  protected readonly saveState = this.workflow.saveState;
  protected readonly validationMessage = this.workflow.validationMessage;
  private readonly mediaSelection = new LibraryEntryEditMediaSelection();
  protected readonly selectedMedia = this.mediaSelection.selected;
  protected readonly boldActive = signal(false);
  protected readonly italicActive = signal(false);
  protected readonly blockFormat = signal<LibraryEntryEditBlockFormat>('p');

  @ViewChild('editorBody')
  private readonly editorBody?: ElementRef<HTMLElement>;
  private backButtonSubscription: Subscription | null = null;
  private readonly formattingController = new LibraryEntryEditFormattingController(
    this.document,
    () => this.editorBody?.nativeElement,
  );
  private readonly selectionChangeListener = (): void => {
    this.formattingController.rememberSelection();
    this.refreshFormattingState();
  };

  public constructor() {
    registerLibraryEntryEditIcons();
  }

  public ngOnInit(): void {
    this.document.addEventListener('selectionchange', this.selectionChangeListener);
    this.registerBackButtonHandler();
    void this.loadEntry();
  }

  public ngOnDestroy(): void {
    this.document.removeEventListener('selectionchange', this.selectionChangeListener);
    this.backButtonSubscription?.unsubscribe();
    this.backButtonSubscription = null;
  }

  protected async save(): Promise<void> {
    await this.workflow.save(this.currentDraftHtml());
  }

  protected async resetToOriginal(): Promise<void> {
    await this.workflow.resetToOriginal();
  }

  protected cancel(): void {
    void this.requestLeave();
  }

  protected back(): void {
    void this.requestLeave();
  }

  protected selectMedia(event: Event): void {
    this.mediaSelection.selectFromEvent(this.editorBody?.nativeElement, event);
  }

  protected deleteSelectedMedia(): void {
    this.mediaSelection.deleteSelected();
  }

  protected preserveEditorInteraction(event: Event): void {
    event.preventDefault();
    this.formattingController.rememberSelection();
  }

  protected refreshEditorInteraction(): void {
    this.formattingController.rememberSelection();
    this.refreshFormattingState();
  }

  protected runFormattingCommand(command: LibraryEntryEditCommand): void {
    if (this.isFormattingDisabled()) {
      return;
    }

    this.formattingController.runCommand(command);
    this.refreshFormattingState();
  }

  protected setBlockFormat(format: LibraryEntryEditBlockFormat): void {
    if (this.isFormattingDisabled()) {
      return;
    }

    this.formattingController.setBlockFormat(format);
    this.blockFormat.set(format);
    this.refreshFormattingState();
  }

  protected isFormattingDisabled(): boolean {
    return (
      this.entry() === null || this.saveState() === 'saving' || this.saveState() === 'resetting'
    );
  }

  private async loadEntry(): Promise<void> {
    await this.workflow.loadEntry();
    this.refreshFormattingState();
  }

  private async requestLeave(): Promise<void> {
    await this.workflow.requestLeave(this.currentDraftHtml());
  }

  private registerBackButtonHandler(): void {
    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, () => {
      void this.requestLeave();
    });
  }

  private currentDraftHtml(): string {
    return this.mediaSelection.draftHtml(this.editorBody?.nativeElement);
  }

  private refreshFormattingState(): void {
    const state = this.formattingController.currentState();
    if (state === null) {
      this.boldActive.set(false);
      this.italicActive.set(false);
      this.blockFormat.set('p');
      return;
    }

    this.boldActive.set(state.boldActive);
    this.italicActive.set(state.italicActive);
    this.blockFormat.set(state.blockFormat);
  }
}
