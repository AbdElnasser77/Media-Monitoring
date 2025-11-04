import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { ApiService } from './services/api.service';

/**
 * Factory function to initialize the API service data loading
 * This ensures the data is loaded only once when the app starts
 */
export function initializeApp(apiService: ApiService): () => Promise<void> {
  return () => apiService.initialize();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(),
    // Load API data once at app startup
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ApiService],
      multi: true
    }
  ]
};
