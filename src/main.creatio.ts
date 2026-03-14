/**
 * Creatio entry point — registers the custom element without bootstrapping a full Angular app.
 * No root DOM element needed. The custom element is available once this script loads.
 */
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideZonelessChangeDetection } from '@angular/core';
import { HierarchicalListComponent } from './app/components/hierarchical-list/hierarchical-list.component';

createApplication({
  providers: [provideZonelessChangeDetection()],
})
  .then((appRef) => {
    const el = createCustomElement(HierarchicalListComponent, { injector: appRef.injector });
    if (!customElements.get('forecast-hierarchy')) {
      customElements.define('forecast-hierarchy', el);
    }
  })
  .catch((err) => console.error('forecast-hierarchy init error:', err));
