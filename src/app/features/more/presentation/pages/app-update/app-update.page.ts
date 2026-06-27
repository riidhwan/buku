import { Component, inject } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { MoreFacade } from '../../../application/more.facade';

@Component({
  selector: 'app-app-update-page',
  templateUrl: './app-update.page.html',
  styleUrl: './app-update.page.scss',
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
})
export class AppUpdatePage {
  protected readonly more = inject(MoreFacade);

  protected checkForUpdate(): void {
    void this.more.checkForAppUpdate();
  }

  protected installUpdate(): void {
    void this.more.installAppUpdate();
  }

  protected canInstallUpdate(): boolean {
    const state = this.more.appUpdate();
    return (
      state.status === 'update-available' ||
      state.status === 'install-started' ||
      (state.status === 'failure' && state.release !== null)
    );
  }

  protected failureMessage(reason: string): string {
    const messages: Record<string, string> = {
      'network-unavailable': 'Network is unavailable. Check your connection and try again.',
      'release-source-unavailable': 'GitHub Releases is unavailable. Try again later.',
      'invalid-release-metadata': 'The latest release cannot be installed by Buku.',
      'installed-version-unavailable': 'Buku could not read the installed app version.',
      'download-failed': 'The APK download failed. Try again.',
      'install-permission-required': 'Allow installs from Buku in Android settings, then retry.',
      'installer-unavailable': 'Android package installer is unavailable.',
      'invalid-apk': 'The update APK is invalid.',
    };

    return messages[reason] ?? 'The update check failed. Try again.';
  }
}
