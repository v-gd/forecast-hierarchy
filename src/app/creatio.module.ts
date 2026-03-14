import { DoBootstrap, Injector, NgModule, ProviderToken } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { CrtModule, bootstrapCrtModule } from '@creatio-devkit/common';
import { HierarchicalListComponent } from './components/hierarchical-list/hierarchical-list.component';

/**
 * Creatio CrtModule for Freedom UI integration.
 * Registers HierarchicalListComponent as a Freedom UI view element.
 *
 * This module is only used when building for Creatio deployment.
 * The standalone sandbox (app.ts) uses its own bootstrap.
 */
@CrtModule({
  viewElements: [HierarchicalListComponent],
})
@NgModule({
  imports: [HierarchicalListComponent],
})
export class CreatioModule implements DoBootstrap {
  constructor(private injector: Injector) {}

  ngDoBootstrap(): void {
    const element = createCustomElement(HierarchicalListComponent, {
      injector: this.injector,
    });
    customElements.define('usr-forecast-hierarchy', element);

    bootstrapCrtModule('forecast_hierarchy', CreatioModule, {
      resolveDependency: (token) =>
        this.injector.get(token as ProviderToken<unknown>),
    });
  }
}
