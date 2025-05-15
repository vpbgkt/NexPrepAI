import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { AuthInterceptor } from './app/auth.interceptor';
import { appConfig } from './app/app.config'; // Import appConfig

bootstrapApplication(AppComponent, {
  providers: [
    ...appConfig.providers, // Spread the providers from app.config.ts

    // HttpClient providers (including interceptor)
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
})
  .catch((err) => console.error('Bootstrap error:', err));
