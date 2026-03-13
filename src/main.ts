import { bootstrapApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { ApplicationRef } from '@angular/core';
import { HierarchicalListComponent } from './app/components/hierarchical-list/hierarchical-list.component';

bootstrapApplication(App, appConfig)
  .then((appRef: ApplicationRef) => {
    const el = createCustomElement(HierarchicalListComponent, { injector: appRef.injector });
    customElements.define('forecast-hierarchy', el);
  })
  .catch((err) => console.error(err));
