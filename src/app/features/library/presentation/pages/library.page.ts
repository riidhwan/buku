import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-library-page',
  templateUrl: './library.page.html',
  imports: [IonContent, IonHeader, IonTitle, IonToolbar],
})
export class LibraryPage {}
