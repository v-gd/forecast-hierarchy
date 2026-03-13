import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, viewChild, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataRecord, HierarchyConfig, GenericColumnDef } from './models/hierarchy.model';

const SAMPLE_HIERARCHY: HierarchyConfig = {
  idField: 'id',
  parentIdField: 'parentId',
  nameField: 'name',
  subtitleField: 'region',
  statusField: 'status',
  statusValues: {
    success: ['on-track'],
    error: ['at-risk'],
  },
};

const SAMPLE_COLUMNS: GenericColumnDef[] = [
  { id: 'quota', field: 'quota', label: 'Quota', format: 'currency', defaultWidth: 140, minWidth: 80 },
  { id: 'booked', field: 'booked', label: 'Booked', format: 'currency', defaultWidth: 156, minWidth: 100, progressOf: 'quota' },
  { id: 'gapToGo', field: 'gapToGo', label: 'Gap to go', format: 'currency', defaultWidth: 140, minWidth: 80, colorRule: { positive: 'error', negative: 'error' } },
  { id: 'forecastCall', field: 'forecastCall', label: 'Forecast call', format: 'currency', defaultWidth: 172, minWidth: 100, progressOf: 'quota', trendVs: 'prevForecast' },
  { id: 'aiForecastCall', field: 'aiForecastCall', label: 'AI Forecast Call', format: 'currency', defaultWidth: 180, minWidth: 100 },
  { id: 'managerJudgment', field: 'managerJudgment', label: 'Manager judgment', format: 'currency', defaultWidth: 164, minWidth: 100 },
  { id: 'commit', field: 'commit', label: 'Commit', format: 'currency', defaultWidth: 132, minWidth: 80, trendVs: 'prevCommit', colorRule: { positive: 'success', negative: 'error' } },
];

const SAMPLE_DATA: DataRecord[] = [
  { id: '1', parentId: null, name: 'Sam Smith', region: 'United States', status: 'at-risk', quota: 16000000, booked: 8500000, gapToGo: -1500000, forecastCall: 15500000, prevForecast: 15500000, aiForecastCall: 15000000, managerJudgment: 16000000, commit: 10000000, prevCommit: 8500000 },
  { id: '1-1', parentId: '1', name: 'Ben Brown', region: 'Northeast US', status: 'on-track', quota: 4000000, booked: 2000000, gapToGo: -1000000, forecastCall: 3500000, prevForecast: 3800000, aiForecastCall: 3000000, managerJudgment: 5500000, commit: 2500000, prevCommit: 2000000 },
  { id: '1-2', parentId: '1', name: 'Max Miller', region: 'Midwest US', status: 'at-risk', quota: 4000000, booked: 1500000, gapToGo: -2500000, forecastCall: 3500000, prevForecast: 3500000, aiForecastCall: 3000000, managerJudgment: 5000000, commit: 2000000, prevCommit: 1800000 },
  { id: '1-3', parentId: '1', name: 'Jack White', region: 'South US', status: 'on-track', quota: 3500000, booked: 2000000, gapToGo: -1500000, forecastCall: 3500000, prevForecast: 3000000, aiForecastCall: 4000000, managerJudgment: 5200000, commit: 2200000, prevCommit: 2200000 },
  { id: '2', parentId: null, name: 'Lisa Chen', region: 'EMEA', status: 'on-track', quota: 12000000, booked: 7200000, gapToGo: -800000, forecastCall: 11500000, prevForecast: 10500000, aiForecastCall: 11800000, managerJudgment: 12000000, commit: 9000000, prevCommit: 7500000 },
  { id: '2-1', parentId: '2', name: 'Karl Weber', region: 'Germany', status: 'on-track', quota: 5000000, booked: 3100000, gapToGo: -400000, forecastCall: 4800000, prevForecast: 4500000, aiForecastCall: 4900000, managerJudgment: 5000000, commit: 3800000, prevCommit: 3200000 },
  { id: '2-2', parentId: '2', name: 'Sophie Martin', region: 'France', status: 'on-track', quota: 4000000, booked: 2600000, gapToGo: -200000, forecastCall: 3800000, prevForecast: 3500000, aiForecastCall: 3900000, managerJudgment: 4000000, commit: 3200000, prevCommit: 2800000 },
];

@Component({
  selector: 'app-root',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit {
  private fcEl = viewChild<ElementRef>('fcElement');

  protected configJson = JSON.stringify({ hierarchy: SAMPLE_HIERARCHY, columns: SAMPLE_COLUMNS }, null, 2);
  protected dataJson = JSON.stringify(SAMPLE_DATA, null, 2);
  protected configError = '';
  protected dataError = '';

  ngAfterViewInit(): void {
    this.applyAll();
  }

  protected applyConfig(): void {
    const el = this.getElement();
    if (!el) return;
    try {
      const parsed = JSON.parse(this.configJson);
      if (parsed.hierarchy) el.hierarchy = parsed.hierarchy;
      if (parsed.columns) {
        if (!Array.isArray(parsed.columns)) throw new Error('"columns" must be an array');
        el.columns = parsed.columns;
      }
      this.configError = '';
    } catch (e: any) {
      this.configError = e.message;
    }
  }

  protected applyData(): void {
    const el = this.getElement();
    if (!el) return;
    try {
      const data = JSON.parse(this.dataJson);
      if (!Array.isArray(data)) throw new Error('Data must be an array');
      el.data = data;
      this.dataError = '';
    } catch (e: any) {
      this.dataError = e.message;
    }
  }

  protected applyAll(): void {
    this.applyConfig();
    this.applyData();
  }

  private getElement(): any {
    return this.fcEl()?.nativeElement;
  }
}
