import { DataRecord, GenericColumnDef, HierarchyConfig, TreeNode } from '../../models/hierarchy.model';

/**
 * Applies aggregate functions (sum, avg, min, max, count) to parent nodes.
 * Walks the tree bottom-up: leaf values are used as-is, parent values
 * are computed from direct children (which already have their own
 * aggregated values if they are parents too — so it cascades naturally).
 *
 * Only columns with `aggregate` set to something other than 'none' are affected.
 * The computed value is written directly into the parent's record.
 */
export function applyAggregates(roots: TreeNode[], columns: GenericColumnDef[]): void {
  const aggColumns = columns.filter(c => c.aggregate && c.aggregate !== 'none');
  if (aggColumns.length === 0) return;

  for (const root of roots) {
    aggregateNode(root, aggColumns);
  }
}

function aggregateNode(node: TreeNode, columns: GenericColumnDef[]): void {
  if (node.children.length === 0) return;

  // Recurse children first (bottom-up)
  for (const child of node.children) {
    aggregateNode(child, columns);
  }

  for (const col of columns) {
    const values = node.children
      .map(c => c.record[col.field])
      .filter((v): v is number => typeof v === 'number');

    if (values.length === 0) continue;

    switch (col.aggregate) {
      case 'sum':
        node.record[col.field] = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        node.record[col.field] = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'min':
        node.record[col.field] = Math.min(...values);
        break;
      case 'max':
        node.record[col.field] = Math.max(...values);
        break;
      case 'count':
        node.record[col.field] = values.length;
        break;
    }
  }
}

export function buildTree(data: DataRecord[], config: HierarchyConfig): TreeNode[] {
  const { idField, parentIdField } = config;

  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Create TreeNode for each record
  for (const record of data) {
    const id = String(record[idField] ?? '');
    nodeMap.set(id, { record, id, children: [] });
  }

  // Link parents to children
  for (const record of data) {
    const id = String(record[idField] ?? '');
    const parentId = record[parentIdField];
    const node = nodeMap.get(id)!;

    if (parentId == null || parentId === '') {
      roots.push(node);
    } else {
      const parent = nodeMap.get(String(parentId));
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node); // orphan → treat as root
      }
    }
  }

  return roots;
}
