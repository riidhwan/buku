import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { pauseCircleOutline, playCircleOutline, trashOutline } from 'ionicons/icons';
import { MoreFacade } from '../../application/more.facade';
import { moreRouteTargets } from '../more-route-targets';

@Component({
  selector: 'app-more-page',
  templateUrl: './more.page.html',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonTitle,
    IonToolbar,
    RouterLink,
  ],
})
export class MorePage implements OnInit {
  protected readonly more = inject(MoreFacade);
  protected readonly routeTargets = moreRouteTargets;

  public constructor() {
    addIcons({ pauseCircleOutline, playCircleOutline, trashOutline });
  }

  public ngOnInit(): void {
    void this.more.loadManualChapterNavigationRules();
  }

  protected toggleRule(id: string, enabled: boolean): Promise<void> {
    return this.more.setManualChapterNavigationRuleEnabled(id, !enabled);
  }

  protected deleteRule(id: string): Promise<void> {
    return this.more.deleteManualChapterNavigationRule(id);
  }
}
