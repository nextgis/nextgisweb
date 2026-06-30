import { Bounds, Key } from "copc";
import type { Extent } from "ol/extent";

const MIN_POINTS_PER_NODE = 128;
const MAX_SELECTED_NODES = 64;
const LOD_PIXEL_FACTOR = 2;

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
  signature: string;
  sourceResolution: number;
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

function hasHierarchyConflict(
  selectedNodes: HierarchyNodeEntry[],
  candidate: HierarchyNodeEntry
) {
  return selectedNodes.some(
    (selected) =>
      isAncestorKey(selected.key, candidate.key) ||
      isAncestorKey(candidate.key, selected.key)
  );
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

export function estimateTargetLevel(
  nodes: HierarchyNodeEntry[],
  extent: Extent,
  size: [number, number]
) {
  if (!nodes.length) {
    return 0;
  }

  const width = Math.max(extent[2] - extent[0], 1);
  const height = Math.max(extent[3] - extent[1], 1);
  const sourceResolution = Math.max(
    width / Math.max(size[0], 1),
    height / Math.max(size[1], 1)
  );
  const desiredSpacing = sourceResolution * LOD_PIXEL_FACTOR;

  let targetLevel = nodes[0].level;
  for (const node of nodes) {
    if (node.spacing <= desiredSpacing) {
      targetLevel = Math.max(targetLevel, node.level);
    }
  }

  return targetLevel;
}

export function selectHierarchyNodesForView(
  nodes: HierarchyNodeEntry[],
  extent: Extent,
  size: [number, number],
  pointBudget: number
): PointCloudViewSelection {
  const width = Math.max(extent[2] - extent[0], 1);
  const height = Math.max(extent[3] - extent[1], 1);
  const sourceResolution = Math.max(
    width / Math.max(size[0], 1),
    height / Math.max(size[1], 1)
  );
  const intersecting = nodes.filter((node) =>
    intersectsExtent(node.bounds, extent)
  );

  if (!intersecting.length) {
    return {
      selectedNodes: [],
      targetLevel: 0,
      signature: buildViewSignature(extent, sourceResolution, 0, []),
      sourceResolution,
    };
  }

  const targetLevel = estimateTargetLevel(intersecting, extent, size);
  const sorted = [...intersecting].sort((a, b) => {
    const overlapDiff =
      intersectionArea(b.bounds, extent) - intersectionArea(a.bounds, extent);
    if (overlapDiff !== 0) {
      return overlapDiff;
    }

    const aPreferred = a.level >= targetLevel ? 0 : 1;
    const bPreferred = b.level >= targetLevel ? 0 : 1;

    if (aPreferred !== bPreferred) {
      return aPreferred - bPreferred;
    }

    if (a.level !== b.level) {
      return b.level - a.level;
    }

    return b.node.pointCount - a.node.pointCount;
  });

  const maxNodeCount = Math.max(
    8,
    Math.min(MAX_SELECTED_NODES, Math.ceil(pointBudget / MIN_POINTS_PER_NODE))
  );
  const selectedNodes: HierarchyNodeEntry[] = [];

  for (const candidate of sorted) {
    if (selectedNodes.length >= maxNodeCount) {
      break;
    }

    if (!hasHierarchyConflict(selectedNodes, candidate)) {
      selectedNodes.push(candidate);
    }
  }

  if (!selectedNodes.length) {
    selectedNodes.push(sorted[0]);
  }

  const signature = buildViewSignature(
    extent,
    sourceResolution,
    targetLevel,
    selectedNodes
  );

  return {
    selectedNodes: selectedNodes.sort(
      (a, b) => a.level - b.level || b.node.pointCount - a.node.pointCount
    ),
    targetLevel,
    signature,
    sourceResolution,
  };
}
