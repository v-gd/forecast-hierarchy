import { DoBootstrap, Injector, NgModule, ProviderToken, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { BrowserModule } from '@angular/platform-browser';
import { bootstrapCrtModule, CrtModule } from '@creatio-devkit/common';
import { ForecastHierarchyComponent } from './view-elements/forecast-hierarchy/forecast-hierarchy.component';

@CrtModule({
  viewElements: [ForecastHierarchyComponent],
})
@NgModule({
  declarations: [ForecastHierarchyComponent],
  imports: [BrowserModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [],
})
export class AppModule implements DoBootstrap {
  constructor(private _injector: Injector) {}

  ngDoBootstrap(): void {
    const element = createCustomElement(ForecastHierarchyComponent, {
      injector: this._injector,
    });
    if (!customElements.get('usr-forecast-hierarchy')) {
      customElements.define('usr-forecast-hierarchy', element);
    }

    bootstrapCrtModule('forecast_hierarchy', AppModule, {
      resolveDependency: (token) => this._injector.get(<ProviderToken<unknown>>token),
    });
  }
}
