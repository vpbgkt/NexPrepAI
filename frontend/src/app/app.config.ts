import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideAnalytics, getAnalytics, ScreenTrackingService, UserTrackingService } from '@angular/fire/analytics';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideFunctions, getFunctions } from '@angular/fire/functions';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { providePerformance, getPerformance } from '@angular/fire/performance';
import { provideRemoteConfig, getRemoteConfig } from '@angular/fire/remote-config';
import { provideStorage, getStorage } from '@angular/fire/storage';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideAnalytics(() => getAnalytics()),
    // provideFirestore(() => getFirestore()), // Uncomment if you use Firestore
    // provideFunctions(() => getFunctions()), // Uncomment if you use Cloud Functions
    // provideMessaging(() => getMessaging()), // Uncomment if you use FCM
    // providePerformance(() => getPerformance()), // Uncomment if you use Performance Monitoring
    // provideRemoteConfig(() => getRemoteConfig()), // Uncomment if you use Remote Config
    // provideStorage(() => getStorage()), // Uncomment if you use Cloud Storage
    ScreenTrackingService,
    UserTrackingService
  ]
};
