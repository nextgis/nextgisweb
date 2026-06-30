import { Bounds, Key } from "copc";
import type { Extent } from "ol/extent";

const MIN_POINTS_PER_NODE = 128;
const MAX_SELECTED_NODES = 64;
const LOD_PIXEL_FACTOR = 2;
const COVERAGE_THRESHOLD = 0.98;

type HierarchyNodeRecord = {
  pointCount: number;
  pointDataOffset: number;
  pointDataLength: number;
};

export interface HierarchyNodeEntry {
  key: string;
  node: HierarchyNodeRecord;
  level: number;
  bounds: [number, number, number, number, number, number];
  spacing: number;
}

export interface PointCloudViewSelection {
  selectedNodes: HierarchyNodeEntry[];
  targetLevel: number;
  targetSpacing: number;
  signature: string;
  sourceResolution: number;
  fallbackNodeCount: number;
  selectedLevelCounts: Record<number, number>;
}

function quantize(value: number, step: number) {
  return Math.round(value / step);
}

function buildViewSignature(
  extent: Extent,
  sourceResolution: number,
  targetLevel: number,
  selectedNodes: HierarchyNodeEntry[]
) {
  const resolutionStep = Math.max(sourceResolution * 0.25, 1e-9);
  const extentStep = Math.max(sourceResolution * 32, 1e-6);
  const quantizedExtent = extent
    .map((value) => quantize(value, extentStep))
    .join(",");
  const quantizedResolution = quantize(sourceResolution, resolutionStep);

  return `${targetLevel}:${quantizedResolution}:${quantizedExtent}:${selectedNodes
    .map((node) => node.key)
    .sort()
    .join(",")}`;
}

function nodeArea(bounds: [number, number, number, number, number, number]) {
  return (
    Math.max(bounds[3] - bounds[0], 0) * Math.max(bounds[4] - bounds[1], 0)
  );
}

function intersectionArea(
  bounds: [number, number, number, number, number, number],
  extent: Extent
) {
  const minx = Math.max(bounds[0], extent[0]);
  const miny = Math.max(bounds[1], extent[1]);
  const maxx = Math.min(bounds[3], extent[2]);
  const maxy = Math.min(bounds[4], extent[3]);

  if (minx >= maxx || miny >= maxy) {
    return 0;
  }

  return (maxx - minx) * (maxy - miny);
}

function intersectsExtent(
  bounds: [number, number, number, number, number, number],
  extent: Extent
) {
  return !(
    bounds[3] < extent[0] ||
    bounds[0] > extent[2] ||
    bounds[4] < extent[1] ||
    bounds[1] > extent[3]
  );
}

export function viewportFraction(
  bounds: HierarchyNodeEntry["bounds"],
  extent: Extent
) {
  const area = nodeArea(bounds);
  if (area <= 0) {
    return 1;
  }

  return Math.max(intersectionArea(bounds, extent) / area, 1e-6);
}

function isAncestorKey(ancestorKey: string, descendantKey: string) {
  const ancestor = Key.create(ancestorKey);
  const descendant = Key.create(descendantKey);
  const depthDiff = descendant[0] - ancestor[0];

  if (depthDiff < 0) {
    return false;
  }

  return (
    ancestor[1] === descendant[1] >> depthDiff &&
    ancestor[2] === descendant[2] >> depthDiff &&
    ancestor[3] === descendant[3] >> depthDiff
  );
}

function parentKey(key: string) {
  const parsed = Key.create(key);
  const level = parsed[0];
  if (level <= 0) {
    return null;
  }

  return `${level - 1}-${parsed[1] >> 1}-${parsed[2] >> 1}-${parsed[3] >> 1}`;
}

function createChildrenByKey(nodes: HierarchyNodeEntry[]) {
  const childrenByKey = new Map<string, HierarchyNodeEntry[]>();

  for (const node of nodes) {
    const parent = parentKey(node.key);
    if (!parent) {
      continue;
    }

    const children = childrenByKey.get(parent);
    if (children) {
      children.push(node);
    } else {
      childrenByKey.set(parent, [node]);
    }
  }

  return childrenByKey;
}

function getRootNodes(nodes: HierarchyNodeEntry[]) {
  return nodes.filter((node) => {
    return !nodes.some((other) => {
      return other !== node && isAncestorKey(other.key, node.key);
    });
  });
}

export function buildHierarchyNodeEntry(
  cube: [number, number, number, number, number, number],
  spacing: number,
  key: string,
  node: HierarchyNodeRecord
): HierarchyNodeEntry {
  const parsedKey = Key.create(key);
  const level = parsedKey[0];

  return {
    key,
    node,
    level,
    bounds: Bounds.stepTo(cube, parsedKey),
    spacing: spacing / Math.pow(2, level),
  };
}

export function computeSourceResolution(
  extent: Extent,
  size: [number, number]
) {
  const width = Math.max(extent[2] - extent[0], 1);
  const height = Math.max(extent[3] - extent[1], 1);
  return Math.max(width / Math.max(size[0], 1), height / Math.max(size[1], 1));
}

function getLevelSpacing(nodes: HierarchyNodeEntry[]) {
  const spacingByLevel = new Map<number, number>();

  for (const node of nodes) {
    const current = spacingByLevel.get(node.level);
    spacingByLevel.set(
      node.level,
      current === undefined ? node.spacing : Math.min(current, node.spacing)
    );
  }

  return [...spacingByLevel.entries()]
    .map(([level, spacing]) => ({ level, spacing }))
    .sort((a, b) => a.level - b.level);
}

export function estimateTargetLevel(
  nodes: HierarchyNodeEntry[],
  extent: Extent,
  size: [number, number]
) {
  if (!nodes.length) {
    return 0;
  }

  const sourceResolution = computeSourceResolution(extent, size);
  const desiredSpacing = sourceResolution * LOD_PIXEL_FACTOR;
  const levelSpacing = getLevelSpacing(nodes);
  const sufficient = levelSpacing.find((entry) => {
    return entry.spacing <= desiredSpacing;
  });

  return sufficient?.level ?? levelSpacing[levelSpacing.length - 1].level;
}

function getTargetSpacing(nodes: HierarchyNodeEntry[], targetLevel: number) {
  const targetNodes = nodes.filter((node) => node.level === targetLevel);
  if (targetNodes.length) {
    return Math.min(...targetNodes.map((node) => node.spacing));
  }

  return Math.min(...nodes.map((node) => node.spacing));
}

function coverageArea(nodes: HierarchyNodeEntry[], extent: Extent) {
  return nodes.reduce((sum, node) => {
    return sum + intersectionArea(node.bounds, extent);
  }, 0);
}

function selectCoverageCut(
  node: HierarchyNodeEntry,
  childrenByKey: Map<string, HierarchyNodeEntry[]>,
  extent: Extent,
  targetLevel: number
): HierarchyNodeEntry[] {
  if (!intersectsExtent(node.bounds, extent)) {
    return [];
  }

  const intersectingChildren = (childrenByKey.get(node.key) ?? []).filter(
    (child) => intersectsExtent(child.bounds, extent)
  );

  if (node.level >= targetLevel || !intersectingChildren.length) {
    return [node];
  }

  const nodeOverlap = intersectionArea(node.bounds, extent);
  const childCoverage = coverageArea(intersectingChildren, extent);
  if (childCoverage < nodeOverlap * COVERAGE_THRESHOLD) {
    return [node];
  }

  return intersectingChildren.flatMap((child) =>
    selectCoverageCut(child, childrenByKey, extent, targetLevel)
  );
}

function countLevels(nodes: HierarchyNodeEntry[]) {
  return nodes.reduce<Record<number, number>>((acc, node) => {
    acc[node.level] = (acc[node.level] ?? 0) + 1;
    return acc;
  }, {});
}

function selectNodesForLevel(
  nodes: HierarchyNodeEntry[],
  extent: Extent,
  targetLevel: number
) {
  const childrenByKey = createChildrenByKey(nodes);
  const roots = getRootNodes(nodes).filter((node) =>
    intersectsExtent(node.bounds, extent)
  );
  const selected = roots.flatMap((root) =>
    selectCoverageCut(root, childrenByKey, extent, targetLevel)
  );

  return selected.sort(
    (a, b) =>
      a.level - b.level ||
      intersectionArea(b.bounds, extent) - intersectionArea(a.bounds, extent) ||
      b.node.pointCount - a.node.pointCount
  );
}

export function selectHierarchyNodesForView(
  nodes: HierarchyNodeEntry[],
  extent: Extent,
  size: [number, number],
  pointBudget: number
): PointCloudViewSelection {
  const sourceResolution = computeSourceResolution(extent, size);
  const intersecting = nodes.filter((node) =>
    intersectsExtent(node.bounds, extent)
  );

  if (!intersecting.length) {
    return {
      selectedNodes: [],
      targetLevel: 0,
      targetSpacing: 0,
      signature: buildViewSignature(extent, sourceResolution, 0, []),
      sourceResolution,
      fallbackNodeCount: 0,
      selectedLevelCounts: {},
    };
  }

  const maxNodeCount = Math.max(
    8,
    Math.min(MAX_SELECTED_NODES, Math.ceil(pointBudget / MIN_POINTS_PER_NODE))
  );
  const initialTargetLevel = estimateTargetLevel(nodes, extent, size);
  const minLevel = Math.min(...intersecting.map((node) => node.level));
  let targetLevel = initialTargetLevel;
  let selectedNodes = selectNodesForLevel(intersecting, extent, targetLevel);

  while (selectedNodes.length > maxNodeCount && targetLevel > minLevel) {
    targetLevel -= 1;
    selectedNodes = selectNodesForLevel(intersecting, extent, targetLevel);
  }

  const signature = buildViewSignature(
    extent,
    sourceResolution,
    targetLevel,
    selectedNodes
  );

  return {
    selectedNodes,
    targetLevel,
    targetSpacing: getTargetSpacing(nodes, targetLevel),
    signature,
    sourceResolution,
    fallbackNodeCount: selectedNodes.filter((node) => node.level < targetLevel)
      .length,
    selectedLevelCounts: countLevels(selectedNodes),
  };
}
