import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

import { environment } from '../../environments/environment';
import {  HttpClient, provideHttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { MapModule } from './map/map.module';
import { CoreModule } from "./core/core.module";
import { ProfileModule } from './profile/profile.module';
import { MaterialModule } from './shared/material/material.module';


export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}


@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    TranslateModule.forRoot({
        defaultLanguage: 'en',
        loader: {
            provide: TranslateLoader,
            useFactory: HttpLoaderFactory,
            deps: [HttpClient]
        }
    }),
    BrowserModule,
    AppRoutingModule,
    MapModule,
    CoreModule,
    ProfileModule,
    MaterialModule
],
  providers: [
    provideHttpClient(), // ✅ Use this modern provider
    provideClientHydration(withEventReplay()),
    provideFirebaseApp(() => initializeApp({ projectId: "earthconnect-2a956", appId: "1:516868557631:web:7eb8882eea1656fe91618a", storageBucket: "earthconnect-2a956.firebasestorage.app", apiKey: "AIzaSyAB6EwVvGQbpZNHkJBE_3nhJ30mRbPOqWw", authDomain: "earthconnect-2a956.firebaseapp.com", messagingSenderId: "516868557631", measurementId: "G-LZJEBDE0JV" })),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
