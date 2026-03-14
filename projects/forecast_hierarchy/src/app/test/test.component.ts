import { Component, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataRecord, HierarchyConfig, GenericColumnDef } from '../models/hierarchy.model';

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
  selector: 'app-test',
  standalone: true,
  imports: [FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="sandbox">
      <header class="sandbox-header">
        <h1>Forecast Hierarchy Web Component</h1>
        <p>&lt;usr-forecast-hierarchy&gt; — Angular 17 port for Creatio</p>
      </header>

      <section class="component-section">
        <usr-forecast-hierarchy #fcElement></usr-forecast-hierarchy>
      </section>

      <section class="editors">
        <div class="editor-panel">
          <div class="panel-header">
            <h2>Config (hierarchy + columns)</h2>
            <div class="panel-actions">
              <button class="apply-btn" (click)="applyConfig()">Apply</button>
            </div>
          </div>
          @if (configError) { <div class="error-msg">{{ configError }}</div> }
          <textarea class="json-editor" [(ngModel)]="configJson" spellcheck="false"></textarea>
        </div>

        <div class="editor-panel">
          <div class="panel-header">
            <h2>Data (flat records)</h2>
            <div class="panel-actions">
              <button class="apply-btn" (click)="applyData()">Apply</button>
            </div>
          </div>
          @if (dataError) { <div class="error-msg">{{ dataError }}</div> }
          <textarea class="json-editor" [(ngModel)]="dataJson" spellcheck="false"></textarea>
        </div>
      </section>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');
    :host { display: block; min-height: 100dvh; background: #f4f5f7; }
    .sandbox { max-width: 1440px; margin: 0 auto; padding: 24px; }
    .sandbox-header { margin-bottom: 20px; }
    .sandbox-header h1 { font-size: 20px; font-weight: 600; color: #0d2e4e; margin: 0; font-family: 'Montserrat', sans-serif; }
    .sandbox-header p { font-size: 13px; color: #757575; margin: 4px 0 0; font-family: 'Montserrat', sans-serif; }
    .component-section { margin-bottom: 24px; border: 1px solid #e3e3e3; border-radius: 8px; overflow: hidden; background: #fff; }
    .editors { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .editor-panel { border: 1px solid #e3e3e3; border-radius: 8px; background: #fff; display: flex; flex-direction: column; overflow: hidden; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #e7e7e7; }
    .panel-header h2 { font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #757575; margin: 0; }
    .apply-btn { font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 500; padding: 4px 14px; border: 1px solid #004fd6; border-radius: 4px; background: #004fd6; color: #fff; cursor: pointer; transition: all 0.12s; }
    .apply-btn:hover { background: #0042b5; border-color: #0042b5; }
    .error-msg { font-family: 'Montserrat', sans-serif; font-size: 12px; color: #d2310d; padding: 6px 14px; background: rgba(210, 49, 13, 0.06); border-bottom: 1px solid #e7e7e7; }
    .json-editor { flex: 1; min-height: 360px; padding: 12px 14px; border: none; outline: none; resize: vertical; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 12px; line-height: 18px; color: #181818; background: #fafbfc; tab-size: 2; }
    .json-editor:focus { background: #fff; }
  `],
})
export class TestComponent implements AfterViewInit {
  @ViewChild('fcElement', { static: false }) fcEl!: ElementRef;

  configJson = JSON.stringify({ hierarchy: SAMPLE_HIERARCHY, columns: SAMPLE_COLUMNS }, null, 2);
  dataJson = JSON.stringify(SAMPLE_DATA, null, 2);
  configError = '';
  dataError = '';

  ngAfterViewInit(): void {
    setTimeout(() => this.applyAll(), 500);
  }

  applyConfig(): void {
    const el = this.fcEl?.nativeElement;
    if (!el) return;
    try {
      const parsed = JSON.parse(this.configJson);
      if (parsed.hierarchy) el.hierarchy = parsed.hierarchy;
      if (parsed.columns) el.columns = parsed.columns;
      this.configError = '';
    } catch (e: any) {
      this.configError = e.message;
    }
  }

  applyData(): void {
    const el = this.fcEl?.nativeElement;
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

  applyAll(): void {
    this.applyConfig();
    this.applyData();
  }
}
