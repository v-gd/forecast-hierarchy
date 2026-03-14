/**
 * A single data record — a plain object with arbitrary fields.
 * The component does not assume any fixed shape; field names
 * are referenced by string keys in HierarchyConfig and GenericColumnDef.
 */
export type DataRecord = Record<string, unknown>;

/**
 * Configures how the component builds a tree from flat data
 * and what to display in the fixed "Name" column.
 *
 * @example
 * {
 *   idField: 'Id',
 *   parentIdField: 'ParentId',   // null/undefined = root node
 *   nameField: 'FullName',
 *   subtitleField: 'Territory',
 *   statusField: 'ForecastStatus',
 *   statusValues: {
 *     success: ['OnTrack', 'Achieved'],  // green checkmark icon
 *     error: ['AtRisk', 'Behind'],       // red cross icon
 *   }
 * }
 */
export interface HierarchyConfig {
  /** Field that holds the unique record identifier. */
  idField: string;
  /** Field that holds the parent record's id. null/undefined/empty = root node. */
  parentIdField: string;
  /** Field displayed as the primary name in the tree column. */
  nameField: string;
  /** Field displayed as a smaller subtitle below the name. */
  subtitleField?: string;
  /** Field whose value determines the status icon next to the name. */
  statusField?: string;
  /** Maps status field values to visual indicators (green check / red cross). */
  statusValues?: {
    success: string[];
    error: string[];
  };
}

/**
 * How to format cell values.
 * - 'text'     — display as-is
 * - 'number'   — locale-formatted number (e.g. 16,000,000)
 * - 'currency' — currency format (e.g. $16,000,000). Code via currencyCode.
 * - 'percent'  — value is a ratio (0.5 → "50%"). Multiplied by 100 for display.
 * - 'date'     — formatted via Intl.DateTimeFormat (e.g. 08/29/2025)
 */
export type ColumnFormat = 'text' | 'number' | 'currency' | 'percent' | 'date';

/**
 * How parent rows compute their value from children.
 *
 * Default is 'none' — the parent row uses its own value from the data.
 * When set to a function, parent values are computed bottom-up:
 * leaf nodes keep their data values, each parent aggregates its
 * direct children (who already aggregated *their* children),
 * so the result cascades naturally through the full tree.
 *
 * - 'sum'   — parent = sum of children's values
 * - 'avg'   — parent = average of children's values
 * - 'min'   — parent = minimum of children's values
 * - 'max'   — parent = maximum of children's values
 * - 'count' — parent = number of children with a numeric value
 * - 'none'  — no aggregation, parent uses its own value from the data (default)
 *
 * @example
 * // Parent "booked" = sum of all children's "booked":
 * { id: 'booked', field: 'booked', label: 'Booked', format: 'currency', aggregate: 'sum' }
 * // With this config, you can omit "booked" from parent records in the data —
 * // the component will compute it automatically.
 */
export type AggregateFunction = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';

export type ColorSemantic = 'success' | 'error';

/**
 * Controls automatic value coloring based on the sign of the numeric value.
 *
 * For most columns, positive = green, negative = red:
 *   { positive: 'success', negative: 'error' }
 *
 * For "gap to go" where a negative gap is bad:
 *   { positive: 'error', negative: 'error' }
 *
 * The same rule also applies to trend arrows — an "up" trend
 * is colored by `positive`, a "down" trend by `negative`.
 */
export interface ColorRule {
  positive: ColorSemantic;
  negative: ColorSemantic;
  zero?: 'neutral' | ColorSemantic;
}

/**
 * Defines a single data column in the table.
 *
 * @example Plain value column
 * { id: 'quota', field: 'quota', label: 'Quota', format: 'currency' }
 *
 * @example Column with progress bar
 * // Displays record[field] as currency, plus a progress bar showing
 * // record[field] / record[progressOf] * 100 (clamped to 0–100%).
 * // progressOf is the field name that represents the 100% baseline.
 * { id: 'booked', field: 'booked', label: 'Booked', format: 'currency', progressOf: 'quota' }
 *
 * @example Column with trend arrow
 * // Compares record[field] to record[trendVs]:
 * //   field > trendVs → up arrow
 * //   field < trendVs → down arrow
 * //   field === trendVs → neutral dot
 * // Arrow color follows colorRule if set, otherwise default (up=green, down=red).
 * { id: 'commit', field: 'commit', label: 'Commit', format: 'currency',
 *   trendVs: 'prevCommit', colorRule: { positive: 'success', negative: 'error' } }
 *
 * @example Combined progress bar + trend arrow
 * { id: 'forecast', field: 'forecastCall', label: 'Forecast call', format: 'currency',
 *   progressOf: 'quota', trendVs: 'prevForecast' }
 */
export interface GenericColumnDef {
  /** Unique column identifier (used for visibility/width persistence). */
  id: string;
  /** Data field name to read the display value from each record. */
  field: string;
  /** Column header text. */
  label: string;
  /** Display format. Default: 'text'. */
  format?: ColumnFormat;
  /** Default column width in pixels. Default: 140. */
  defaultWidth?: number;
  /** Minimum column width in pixels when resizing. Default: 80. */
  minWidth?: number;
  /** Decimal places for 'number' and 'currency' formats. Default: 0. */
  precision?: number;
  /** ISO 4217 currency code for 'currency' format. Default: 'USD'. */
  currencyCode?: string;
  /**
   * Field name whose value represents 100% for the progress bar.
   * When set, a progress bar is rendered below the value.
   * Bar width = record[field] / record[progressOf] * 100, clamped to 0–100%.
   */
  progressOf?: string;
  /**
   * Field name to compare against for the trend indicator.
   * When set, an arrow icon is shown next to the value:
   *   record[field] > record[trendVs] → up arrow
   *   record[field] < record[trendVs] → down arrow
   *   record[field] === record[trendVs] → neutral dot
   */
  trendVs?: string;
  /** Automatic value coloring based on numeric sign. Also applies to trend arrow colors. */
  colorRule?: ColorRule;
  /**
   * Aggregation function for parent rows.
   * When set (e.g. 'sum'), parent nodes compute this column's value
   * from their children bottom-up. Leaf nodes always use the data value.
   * Default: 'none' — parent uses its own value from the data source.
   * @see AggregateFunction for available functions and cascade behavior.
   */
  aggregate?: AggregateFunction;
}

/** Internal tree node built from flat DataRecord[] by the component. */
export interface TreeNode {
  record: DataRecord;
  id: string;
  children: TreeNode[];
}

export const DEFAULT_HIERARCHY: HierarchyConfig = {
  idField: 'id',
  parentIdField: 'parentId',
  nameField: 'name',
};
