/**
 * Creatio entry point — bootstraps the CrtModule for Freedom UI integration.
 * Used by the Creatio build configuration (angular.json "creatio" config).
 */
import { platformBrowser } from '@angular/platform-browser';
import { CreatioModule } from './app/creatio.module';

platformBrowser().bootstrapModule(CreatioModule)
  .catch((err) => console.error(err));
