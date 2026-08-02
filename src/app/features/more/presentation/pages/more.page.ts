import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { moreRouteTargets } from '../more-route-targets';

@Component({
  selector: 'app-more-page',
  templateUrl: './more.page.html',
  imports: [IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar, RouterLink],
})
export class MorePage {
  protected readonly routeTargets = moreRouteTargets;
}
