import {
  Component, ViewEncapsulation, ChangeDetectionStrategy, ChangeDetectorRef,
  Input, OnInit, OnChanges, OnDestroy, SimpleChanges, HostListener, ElementRef,
} from '@angular/core';
import { CrtViewElement, CrtInput, CrtInterfaceDesignerItem } from '@creatio-devkit/common';
import {
  DataRecord, GenericColumnDef, HierarchyConfig, TreeNode, DEFAULT_HIERARCHY,
} from '../../models/hierarchy.model';
import { buildTree, applyAggregates } from '../../components/hierarchical-list/tree-builder';
import {
  formatCellValue, computeProgress, computeTrend, computeValueColor, computeTrendColor,
  TrendDirection,
} from '../../components/hierarchical-list/cell-renderer';

interface FlatRow {
  node: TreeNode;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

type SortDirection = 'asc' | 'desc';

interface SortState {
  columnId: string;
  direction: SortDirection;
}

interface CellRef {
  nodeId: string;
  columnId: string;
}

export const DEFAULT_COLUMNS: GenericColumnDef[] = [
  { id: 'quota', field: 'quota', label: 'Quota', format: 'currency', defaultWidth: 140, minWidth: 80 },
  { id: 'booked', field: 'booked', label: 'Booked', format: 'currency', defaultWidth: 156, minWidth: 100, progressOf: 'quota' },
  { id: 'gapToGo', field: 'gapToGo', label: 'Gap to go', format: 'currency', defaultWidth: 140, minWidth: 80, colorRule: { positive: 'error', negative: 'error' } },
  { id: 'forecastCall', field: 'forecastCall', label: 'Forecast call', format: 'currency', defaultWidth: 172, minWidth: 100, progressOf: 'quota', trendVs: 'prevForecast' },
  { id: 'aiForecastCall', field: 'aiForecastCall', label: 'AI Forecast Call', format: 'currency', defaultWidth: 180, minWidth: 100 },
  { id: 'managerJudgment', field: 'managerJudgment', label: 'Manager judgment', format: 'currency', defaultWidth: 164, minWidth: 100 },
  { id: 'commit', field: 'commit', label: 'Commit', format: 'currency', defaultWidth: 132, minWidth: 80, trendVs: 'prevCommit', colorRule: { positive: 'success', negative: 'error' } },
];

const NAME_DEFAULT_WIDTH = 320;
const NAME_MIN_WIDTH = 150;

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return fallback;
}

@Component({
  selector: 'usr-forecast-hierarchy',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="forecast-table" [class.is-resizing]="resizing">
      <!-- HEADER -->
      <div class="table-header" [style.grid-template-columns]="gridColumns">
        <div class="col-name header-sortable" (click)="toggleSort('__name__')">
          <span class="header-label">
            Name
            @if (sortState?.columnId === '__name__') {
              <svg class="sort-icon" width="16" height="16" viewBox="0 0 16 16">
                @if (sortState!.direction === 'asc') {
                  <path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#0D2E4E" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                } @else {
                  <path d="M8 4v8M8 12l-3-3M8 12l3-3" stroke="#0D2E4E" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                }
              </svg>
            }
          </span>
          <button class="column-picker-btn" (click)="openColumnPicker($event)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6.5 2h3v3h-3zM6.5 6.5h3v3h-3zM6.5 11h3v3h-3zM2 2h3v3H2zM2 6.5h3v3H2zM2 11h3v3H2zM11 2h3v3h-3zM11 6.5h3v3h-3zM11 11h3v3h-3z" fill="#757575"/>
            </svg>
          </button>
          <div class="resize-handle" (mousedown)="onResizeStart($event, '__name__')"></div>
        </div>
        @for (col of visibleColumnDefs; track col.id) {
          <div class="col-number header-sortable" (click)="toggleSort(col.id)">
            {{ col.label }}
            @if (sortState?.columnId === col.id) {
              <svg class="sort-icon" width="16" height="16" viewBox="0 0 16 16">
                @if (sortState!.direction === 'asc') {
                  <path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="#0D2E4E" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                } @else {
                  <path d="M8 4v8M8 12l-3-3M8 12l3-3" stroke="#0D2E4E" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                }
              </svg>
            }
            <div class="resize-handle" (mousedown)="onResizeStart($event, col.id)"></div>
          </div>
        }
      </div>

      <!-- COLUMN PICKER -->
      @if (columnPickerOpen) {
        <div class="column-picker-backdrop" (click)="toggleColumnPicker()"></div>
        <div class="column-picker">
          <div class="picker-header">
            <span>Columns</span>
            <button class="picker-close" (click)="toggleColumnPicker()">
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="#757575" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="picker-actions">
            <button class="picker-action-btn" (click)="showAllColumns()">Show all</button>
            <button class="picker-action-btn" (click)="hideAllColumns()">Hide all</button>
            <button class="picker-action-btn" (click)="resetColumnWidths()">Reset widths</button>
          </div>
          @for (col of columns; track col.id) {
            <label class="picker-item">
              <input type="checkbox" [checked]="visibleColumns.has(col.id)" (change)="toggleColumn(col.id)" />
              <span>{{ col.label }}</span>
            </label>
          }
        </div>
      }

      <!-- BODY -->
      <div class="table-body">
        @for (row of visibleRows; track row.node.id) {
          <div
            class="table-row"
            [style.grid-template-columns]="gridColumns"
            [class.parent-row]="row.hasChildren"
            [class.child-row]="row.depth > 0"
          >
            <div
              class="col-name"
              [class.cell-selected]="isCellSelected(row.node.id, '__name__')"
              [style.padding-left.px]="row.depth > 0 ? 20 : 4"
              (click)="selectCell(row.node.id, '__name__')"
            >
              <div class="name-cell-left">
                @if (row.hasChildren) {
                  <button class="expand-btn" (click)="onExpandClick($event, row.node.id)">
                    <svg class="chevron-icon" [class.expanded]="row.isExpanded" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M6 4l4 4-4 4" stroke="#0D2E4E" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                }
              </div>
              <div class="name-content">
                <div class="name-block">
                  <span class="node-name">{{ getField(row.node.record, hierarchy.nameField) }}</span>
                  @if (hierarchy.subtitleField) {
                    <span class="node-subtitle">{{ getField(row.node.record, hierarchy.subtitleField!) }}</span>
                  }
                </div>
                @if (hierarchy.statusField) {
                  @if (isStatusSuccess(row.node.record)) {
                    <svg class="status-icon" width="16" height="16" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" fill="#0B8500"/>
                      <path d="M5 8l2 2 4-4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  } @else if (isStatusError(row.node.record)) {
                    <svg class="status-icon" width="16" height="16" viewBox="0 0 16 16">
                      <circle cx="8" cy="8" r="7" fill="#D2310D"/>
                      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
                    </svg>
                  }
                }
              </div>
            </div>

            @for (col of visibleColumnDefs; track col.id) {
              <div
                class="data-cell"
                [class.cell-selected]="isCellSelected(row.node.id, col.id)"
                [class.has-progress]="col.progressOf"
                (click)="selectCell(row.node.id, col.id)"
              >
                @if (col.progressOf) {
                  <div class="progress-value">
                    <span [class]="getValueClasses(row.node.record, col)">
                      {{ getCellDisplay(row.node.record, col) }}
                    </span>
                    @if (getTrend(row.node.record, col); as trend) {
                      <span class="trend-indicator" [class]="getTrendColorClass(trend, col)">
                        @if (trend === 'up') {
                          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        } @else if (trend === 'down') {
                          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 4v8M8 12l-3-3M8 12l3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        } @else {
                          <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.5" fill="currentColor"/></svg>
                        }
                      </span>
                    }
                  </div>
                  <div class="progress-track">
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="getProgress(row.node.record, col)"></div>
                    </div>
                  </div>
                } @else if (col.trendVs) {
                  <span [class]="getValueClasses(row.node.record, col)">
                    {{ getCellDisplay(row.node.record, col) }}
                  </span>
                  @if (getTrend(row.node.record, col); as trend) {
                    <span class="trend-indicator" [class]="getTrendColorClass(trend, col)">
                      @if (trend === 'up') {
                        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 12V4M8 4l-3 3M8 4l3 3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      } @else if (trend === 'down') {
                        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 4v8M8 12l-3-3M8 12l3-3" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      } @else {
                        <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="2.5" fill="currentColor"/></svg>
                      }
                    </span>
                  }
                } @else {
                  <span [class]="getValueClasses(row.node.record, col)">
                    {{ getCellDisplay(row.node.record, col) }}
                  </span>
                }
              </div>
            }
          </div>
        }
      </div>

      @if (copyToast) {
        <div class="copy-toast">Copied: {{ copyToast }}</div>
      }
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap');

    :host { --color-background: #FFFFFF; --color-foreground: #181818; --color-link: #004FD6; --color-secondary: #0D2E4E; --color-label: #757575; --color-error: #D2310D; --color-success: #0B8500; --color-border-row: #E3E3E3; --color-border-cell: #E7E7E7; --color-row-selected: #E7ECFA; --color-progress-track: rgba(204, 222, 252, 0.5); position: relative; display: block; outline: none; }

    .forecast-table { background: var(--color-background); border-bottom: 1px solid var(--color-border-row); overflow-x: auto; min-width: 0; position: relative; }
    .forecast-table.is-resizing { cursor: col-resize; user-select: none; }
    .forecast-table.is-resizing * { cursor: col-resize !important; user-select: none !important; }
    .table-header, .table-row { display: grid; align-items: center; }
    .table-header { height: 36px; border-bottom: 1px solid var(--color-border-row); background: var(--color-background); position: sticky; top: 0; z-index: 1; }
    .table-header .col-name, .table-header .col-number { font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 500; line-height: 16px; color: var(--color-label); white-space: nowrap; position: relative; }
    .table-header .col-name { padding-left: 48px; border-right: 1px solid var(--color-border-cell); display: flex; align-items: center; justify-content: space-between; padding-right: 8px; }
    .table-header .col-number { text-align: right; padding: 8px 16px 8px 4px; }
    .resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 5px; cursor: col-resize; z-index: 2; transition: background 0.1s; }
    .resize-handle:hover { background: var(--color-link); opacity: 0.3; }
    .is-resizing .resize-handle:hover { background: none; }
    .header-sortable { cursor: pointer; user-select: none; transition: color 0.12s; }
    .header-sortable:hover { color: var(--color-secondary); }
    .header-label { display: flex; align-items: center; gap: 2px; }
    .table-header .col-number.header-sortable { display: flex; align-items: center; justify-content: flex-end; gap: 2px; }
    .sort-icon { flex-shrink: 0; }
    .column-picker-btn { background: none; border: 1px solid transparent; border-radius: 4px; cursor: pointer; padding: 2px; display: flex; align-items: center; justify-content: center; transition: all 0.12s; }
    .column-picker-btn:hover { background: var(--color-row-selected); border-color: var(--color-border-cell); }
    .column-picker-backdrop { position: fixed; inset: 0; z-index: 10; }
    .column-picker { position: absolute; top: 36px; left: 240px; z-index: 11; background: var(--color-background); border: 1px solid var(--color-border-row); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); min-width: 220px; padding: 8px 0; }
    .picker-header { display: flex; align-items: center; justify-content: space-between; padding: 4px 12px 8px; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 500; color: var(--color-secondary); border-bottom: 1px solid var(--color-border-cell); }
    .picker-close { background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; border-radius: 4px; }
    .picker-close:hover { background: var(--color-row-selected); }
    .picker-actions { display: flex; gap: 8px; padding: 8px 12px 4px; }
    .picker-action-btn { background: none; border: none; cursor: pointer; font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 500; color: var(--color-link); padding: 0; }
    .picker-action-btn:hover { text-decoration: underline; }
    .picker-item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; color: var(--color-foreground); transition: background 0.1s; }
    .picker-item:hover { background: var(--color-row-selected); }
    .picker-item input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--color-link); cursor: pointer; margin: 0; }
    .table-row { height: 48px; border-bottom: 1px solid var(--color-border-row); }
    .table-row:last-child { border-bottom: none; }
    .table-row > * { align-self: stretch; }
    .parent-row { background-color: var(--color-row-selected); }
    .parent-row .node-name { font-weight: 500; }
    .child-row { background-color: var(--color-background); }
    .col-name { display: flex; align-items: center; gap: 0; min-width: 0; height: 100%; border-right: 1px solid var(--color-border-cell); }
    .name-cell-left { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 40px; padding: 10px 4px; }
    .expand-btn { background: none; border: none; cursor: pointer; padding: 0; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .expand-btn:hover { opacity: 0.7; }
    .chevron-icon { transition: transform 0.15s ease; }
    .chevron-icon.expanded { transform: rotate(90deg); }
    .name-content { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0; padding: 4px 7px 4px 4px; }
    .name-block { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .node-name { font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; line-height: 20px; color: var(--color-link); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .node-subtitle { font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 500; line-height: 16px; color: var(--color-label); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .status-icon { flex-shrink: 0; width: 16px; height: 16px; }
    .data-cell { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 10px 16px 10px 4px; font-family: 'Montserrat', sans-serif; font-size: 13px; font-weight: 500; line-height: 20px; color: var(--color-foreground); font-variant-numeric: tabular-nums; white-space: nowrap; cursor: pointer; }
    .data-cell.has-progress { flex-direction: column; align-items: stretch; justify-content: center; gap: 4px; padding: 8px 16px 8px 4px; }
    .progress-value { display: flex; align-items: center; justify-content: flex-end; gap: 7px; }
    .progress-track { display: flex; align-items: center; gap: 4px; }
    .progress-bar { flex: 1; height: 4px; background-color: var(--color-progress-track); border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(181deg, #0058EF 5%, #0042B5 103%); border-radius: 4px; transition: width 0.3s ease; }
    .trend-indicator { flex-shrink: 0; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; }
    .value-default { font-size: 12px; font-weight: 500; line-height: 16px; color: var(--color-foreground); text-align: right; }
    .value-link { font-size: 12px; font-weight: 500; line-height: 16px; color: var(--color-link); text-align: right; }
    .color-success { color: var(--color-success); }
    .color-error { color: var(--color-error); }
    .cell-selected { box-shadow: inset 0 0 0 1px var(--color-link); background-color: rgba(0, 79, 214, 0.06); }
    .copy-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--color-secondary); color: #fff; font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 500; padding: 8px 16px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); z-index: 100; pointer-events: none; animation: toast-fade 1.5s ease forwards; }
    @keyframes toast-fade { 0% { opacity: 0; transform: translateX(-50%) translateY(8px); } 15% { opacity: 1; transform: translateX(-50%) translateY(0); } 70% { opacity: 1; } 100% { opacity: 0; } }
  `],
})
@CrtViewElement({
  selector: 'usr-forecast-hierarchy',
  type: 'usr.ForecastHierarchy',
})
@CrtInterfaceDesignerItem({
  toolbarConfig: {
    caption: 'Forecast Hierarchy',
    name: 'usr_forecast_hierarchy',
    icon: require('!!raw-loader?{esModule:false}!./icon.svg'),
    defaultPropertyValues: {
      label: 'Forecast Hierarchy',
    },
  },
})
export class ForecastHierarchyComponent implements OnInit, OnChanges, OnDestroy {
  @Input() @CrtInput() data: DataRecord[] = [];
  @Input() @CrtInput() columns: GenericColumnDef[] = [];
  @Input() @CrtInput() hierarchy: HierarchyConfig = DEFAULT_HIERARCHY;
  @Input() @CrtInput() storageKey: string = 'forecast-hierarchy';

  // Mutable state
  private _expandedNodes = new Set<string>();
  visibleColumns = new Set<string>();
  columnPickerOpen = false;
  sortState: SortState | null = null;
  columnWidths: Record<string, number> = {};
  resizing = false;
  selectedCell: CellRef | null = null;
  copyToast = '';

  private _treeRoots: TreeNode[] = [];
  private storageInitialized = false;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  // Resize state
  private resizeColumnId: string | null = null;
  private resizeStartX = 0;
  private resizeStartWidth = 0;
  private resizeMinWidth = 0;
  private boundMouseMove = this.onResizeMove.bind(this);
  private boundMouseUp = this.onResizeEnd.bind(this);

  constructor(
    private hostEl: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
  ) {
    this.hostEl.nativeElement.setAttribute('tabindex', '0');
  }

  // --- Computed getters ---

  get visibleColumnDefs(): GenericColumnDef[] {
    return this.columns.filter(c => this.visibleColumns.has(c.id));
  }

  get gridColumns(): string {
    const nameWidth = this.columnWidths['__name__'] ?? NAME_DEFAULT_WIDTH;
    const cols = this.visibleColumnDefs.map(c => {
      const w = this.columnWidths[c.id] ?? c.defaultWidth ?? 140;
      return `${w}px`;
    });
    return [`${nameWidth}px`, ...cols].join(' ');
  }

  get visibleRows(): FlatRow[] {
    const rows: FlatRow[] = [];
    this.walk(this._treeRoots, 0, this._expandedNodes, this.sortState, rows);
    return rows;
  }

  // --- Lifecycle ---

  ngOnInit(): void {
    const key = this.storageKey;
    const storedVis = loadFromStorage<string[]>(`${key}-visible-columns`, []);
    this.visibleColumns = storedVis.length > 0
      ? new Set(storedVis)
      : new Set(this.columns.map(c => c.id));
    this.columnWidths = loadFromStorage<Record<string, number>>(`${key}-column-widths`, {});
    this.storageInitialized = true;
    this.rebuildTree();
    this.autoExpandParents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['hierarchy'] || changes['columns']) {
      this.rebuildTree();
      this.autoExpandParents();
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  private rebuildTree(): void {
    this._treeRoots = buildTree(this.data, this.hierarchy);
    applyAggregates(this._treeRoots, this.columns);
  }

  private autoExpandParents(): void {
    if (this._treeRoots.length > 0 && this._expandedNodes.size === 0) {
      const ids = new Set<string>();
      this.collectParentIds(this._treeRoots, ids);
      this._expandedNodes = ids;
    }
  }

  // --- Template helpers ---

  getField(record: DataRecord, field: string): string {
    const val = record[field];
    return val == null ? '' : String(val);
  }

  isStatusSuccess(record: DataRecord): boolean {
    if (!this.hierarchy.statusField) return false;
    const val = String(record[this.hierarchy.statusField] ?? '');
    return this.hierarchy.statusValues?.success?.includes(val) ?? false;
  }

  isStatusError(record: DataRecord): boolean {
    if (!this.hierarchy.statusField) return false;
    const val = String(record[this.hierarchy.statusField] ?? '');
    return this.hierarchy.statusValues?.error?.includes(val) ?? false;
  }

  getCellDisplay(record: DataRecord, col: GenericColumnDef): string {
    return formatCellValue(record[col.field], col);
  }

  getProgress(record: DataRecord, col: GenericColumnDef): number {
    return computeProgress(record, col) ?? 0;
  }

  getTrend(record: DataRecord, col: GenericColumnDef): TrendDirection | null {
    return computeTrend(record, col);
  }

  getValueClasses(record: DataRecord, col: GenericColumnDef): string {
    const base = col.progressOf || col.trendVs ? 'value-link' : 'value-default';
    const color = computeValueColor(record[col.field], col.colorRule);
    return color ? `${base} ${color}` : base;
  }

  getTrendColorClass(trend: TrendDirection, col: GenericColumnDef): string {
    return computeTrendColor(trend, col.colorRule);
  }

  // --- Keyboard ---

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.selectedCell = null;
      this.cdr.markForCheck();
      return;
    }
    const cell = this.selectedCell;
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      if (!cell) return;
      const value = this.getCellCopyValue(cell);
      if (value === null) return;
      event.preventDefault();
      navigator.clipboard.writeText(value).then(() => this.showCopyToast(value));
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      if (!cell) return;
      event.preventDefault();
      this.moveSelection(cell, event.key);
    }
  }

  private moveSelection(cell: CellRef, direction: string): void {
    const rows = this.visibleRows;
    const columns = ['__name__', ...this.visibleColumnDefs.map(c => c.id)];
    const rowIdx = rows.findIndex(r => r.node.id === cell.nodeId);
    const colIdx = columns.indexOf(cell.columnId);
    if (rowIdx === -1 || colIdx === -1) return;
    let newRow = rowIdx, newCol = colIdx;
    switch (direction) {
      case 'ArrowUp': newRow = Math.max(0, rowIdx - 1); break;
      case 'ArrowDown': newRow = Math.min(rows.length - 1, rowIdx + 1); break;
      case 'ArrowLeft': newCol = Math.max(0, colIdx - 1); break;
      case 'ArrowRight': newCol = Math.min(columns.length - 1, colIdx + 1); break;
    }
    this.selectedCell = { nodeId: rows[newRow].node.id, columnId: columns[newCol] };
    this.cdr.markForCheck();
  }

  selectCell(nodeId: string, columnId: string): void {
    this.selectedCell = { nodeId, columnId };
    this.hostEl.nativeElement.focus();
    this.cdr.markForCheck();
  }

  isCellSelected(nodeId: string, columnId: string): boolean {
    return this.selectedCell !== null && this.selectedCell.nodeId === nodeId && this.selectedCell.columnId === columnId;
  }

  onExpandClick(event: MouseEvent, nodeId: string): void {
    event.stopPropagation();
    this.toggleExpand(nodeId);
  }

  private getCellCopyValue(cell: CellRef): string | null {
    const row = this.visibleRows.find(r => r.node.id === cell.nodeId);
    if (!row) return null;
    if (cell.columnId === '__name__') return this.getField(row.node.record, this.hierarchy.nameField);
    const col = this.columns.find(c => c.id === cell.columnId);
    if (!col) return null;
    return formatCellValue(row.node.record[col.field], col);
  }

  private showCopyToast(value: string): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    const display = value.length > 30 ? value.substring(0, 30) + '...' : value;
    this.copyToast = display;
    this.cdr.markForCheck();
    this.toastTimeout = setTimeout(() => { this.copyToast = ''; this.cdr.markForCheck(); }, 1500);
  }

  // --- Resize ---

  onResizeStart(event: MouseEvent, columnId: string): void {
    event.stopPropagation();
    event.preventDefault();
    this.resizeColumnId = columnId;
    this.resizeStartX = event.clientX;
    if (columnId === '__name__') {
      this.resizeStartWidth = this.columnWidths['__name__'] ?? NAME_DEFAULT_WIDTH;
      this.resizeMinWidth = NAME_MIN_WIDTH;
    } else {
      const col = this.columns.find(c => c.id === columnId);
      this.resizeStartWidth = this.columnWidths[columnId] ?? col?.defaultWidth ?? 140;
      this.resizeMinWidth = col?.minWidth ?? 80;
    }
    this.resizing = true;
    this.cdr.markForCheck();
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mouseup', this.boundMouseUp);
  }

  private onResizeMove(event: MouseEvent): void {
    if (!this.resizeColumnId) return;
    const delta = event.clientX - this.resizeStartX;
    const newWidth = Math.max(this.resizeMinWidth, this.resizeStartWidth + delta);
    this.columnWidths = { ...this.columnWidths, [this.resizeColumnId]: newWidth };
    this.cdr.markForCheck();
  }

  private onResizeEnd(): void {
    this.resizeColumnId = null;
    this.resizing = false;
    this.persistColumnWidths();
    this.cdr.markForCheck();
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mouseup', this.boundMouseUp);
  }

  resetColumnWidths(): void {
    this.columnWidths = {};
    this.persistColumnWidths();
    this.cdr.markForCheck();
  }

  // --- Sort ---

  toggleSort(columnId: string): void {
    if (this.sortState?.columnId === columnId) {
      this.sortState = this.sortState.direction === 'asc' ? { columnId, direction: 'desc' } : null;
    } else {
      this.sortState = { columnId, direction: 'asc' };
    }
    this.cdr.markForCheck();
  }

  // --- Column visibility ---

  toggleColumn(columnId: string): void {
    const next = new Set(this.visibleColumns);
    next.has(columnId) ? next.delete(columnId) : next.add(columnId);
    this.visibleColumns = next;
    this.persistVisibleColumns();
    this.cdr.markForCheck();
  }

  showAllColumns(): void {
    this.visibleColumns = new Set(this.columns.map(c => c.id));
    this.persistVisibleColumns();
    this.cdr.markForCheck();
  }

  hideAllColumns(): void {
    this.visibleColumns = new Set();
    this.persistVisibleColumns();
    this.cdr.markForCheck();
  }

  openColumnPicker(event: MouseEvent): void {
    event.stopPropagation();
    this.columnPickerOpen = !this.columnPickerOpen;
    this.cdr.markForCheck();
  }

  toggleColumnPicker(): void {
    this.columnPickerOpen = !this.columnPickerOpen;
    this.cdr.markForCheck();
  }

  // --- Expand/collapse ---

  toggleExpand(nodeId: string): void {
    const next = new Set(this._expandedNodes);
    next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
    this._expandedNodes = next;
    this.cdr.markForCheck();
  }

  // --- Persistence ---

  private persistVisibleColumns(): void {
    if (this.storageInitialized && this.visibleColumns.size > 0) {
      localStorage.setItem(`${this.storageKey}-visible-columns`, JSON.stringify([...this.visibleColumns]));
    }
  }

  private persistColumnWidths(): void {
    if (this.storageInitialized) {
      localStorage.setItem(`${this.storageKey}-column-widths`, JSON.stringify(this.columnWidths));
    }
  }

  // --- Tree walk ---

  private walk(nodes: TreeNode[], depth: number, expanded: Set<string>, sort: SortState | null, out: FlatRow[]): void {
    const sorted = sort ? this.sortNodes(nodes, sort) : nodes;
    for (const node of sorted) {
      const hasChildren = node.children.length > 0;
      const isExpanded = expanded.has(node.id);
      out.push({ node, depth, hasChildren, isExpanded });
      if (hasChildren && isExpanded) {
        this.walk(node.children, depth + 1, expanded, sort, out);
      }
    }
  }

  private sortNodes(nodes: TreeNode[], sort: SortState): TreeNode[] {
    const field = sort.columnId === '__name__' ? this.hierarchy.nameField
      : this.columns.find(c => c.id === sort.columnId)?.field;
    if (!field) return nodes;
    return [...nodes].sort((a, b) => {
      const aVal = a.record[field];
      const bVal = b.record[field];
      let cmp: number;
      if (typeof aVal === 'string' && typeof bVal === 'string') cmp = aVal.localeCompare(bVal);
      else if (typeof aVal === 'number' && typeof bVal === 'number') cmp = aVal - bVal;
      else cmp = 0;
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }

  private collectParentIds(nodes: TreeNode[], ids: Set<string>): void {
    for (const node of nodes) {
      if (node.children.length > 0) {
        ids.add(node.id);
        this.collectParentIds(node.children, ids);
      }
    }
  }
}
