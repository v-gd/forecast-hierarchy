import { DoBootstrap, Injector, NgModule, ProviderToken, CUSTOM_ELEMENTS_SCHEMA, ApplicationRef } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { bootstrapCrtModule, CrtModule } from '@creatio-devkit/common';
import { ForecastHierarchyComponent } from './view-elements/forecast-hierarchy/forecast-hierarchy.component';
import { TestComponent } from './test/test.component';

@CrtModule({
  viewElements: [ForecastHierarchyComponent],
})
@NgModule({
  declarations: [ForecastHierarchyComponent],
  imports: [BrowserModule, FormsModule, TestComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [],
})
export class AppModule implements DoBootstrap {
  constructor(private _injector: Injector) {}

  ngDoBootstrap(appRef: ApplicationRef): void {
    const element = createCustomElement(ForecastHierarchyComponent, {
      injector: this._injector,
    });
    if (!customElements.get('usr-forecast-hierarchy')) {
      customElements.define('usr-forecast-hierarchy', element);
    }

    // In dev mode (served locally), render the test page
    const testRoot = document.querySelector('app-test');
    if (testRoot) {
      appRef.bootstrap(TestComponent, testRoot);
      return;
    }

    // In Creatio, register as remote module
    try {
      bootstrapCrtModule('forecast_hierarchy', AppModule, {
        resolveDependency: (token) => this._injector.get(<ProviderToken<unknown>>token),
      });
    } catch (e) {
      // Not in Creatio context
    }
  }
}
