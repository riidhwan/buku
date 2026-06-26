import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { compassOutline, libraryOutline, menuOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: './app-tabs.component.html',
  imports: [IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs],
})
export class AppTabsComponent {
  public constructor() {
    addIcons({ libraryOutline, compassOutline, menuOutline });
  }
}
