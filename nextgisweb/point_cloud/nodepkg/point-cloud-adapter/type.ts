import type { CreateDisplayAdapterLayerOptions } from "@nextgisweb/webmap/DisplayLayerAdapter";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

// Options not provided by the webmap display yet, to be added along with the
// webmap integration of point clouds
export interface PointCloudLayerOptions extends CreateDisplayAdapterLayerOptions {
  mapProjection?: string;
  mapStore?: MapStore;
}

export interface PointCloudStyleClassificationColor {
  code: number;
  color: string;
}

export interface PointCloudStyleConfig {
  mode: "elevation" | "classification" | "intensity" | "rgb" | "return_number";
  point_size: number;
  opacity: number;
  point_budget: number;
  use_percentile_clip: boolean;
  elevation_min_percent: number;
  elevation_max_percent: number;
  ramp_start_color: string;
  ramp_end_color: string;
  intensity_modulation: boolean;
  classification_colors: PointCloudStyleClassificationColor[];
}

interface PointCloudSrsRef {
  id: number;
}

export interface PointCloudResourceData {
  srs: PointCloudSrsRef;
  srs_proj4?: string | null;
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
  zmin: number;
  zmax: number;
  has_rgb: boolean;
  has_intensity: boolean;
  has_classification: boolean;
  has_returns: boolean;
}

interface PointCloudStyleResourceData {
  value: PointCloudStyleConfig;
}

interface ResourceParentRef {
  id: number;
}

export interface PointCloudResourceItem {
  resource: {
    id: number;
    cls: string;
    parent?: ResourceParentRef | null;
  };
  point_cloud_layer?: PointCloudResourceData;
}

export interface PointCloudStyleResourceItem {
  resource: {
    id: number;
    cls: string;
    parent?: ResourceParentRef | null;
    display_name?: string | null;
  };
  point_cloud_style?: PointCloudStyleResourceData;
}

export interface RawPoint {
  x: number;
  y: number;
  z: number;
  intensity: number | null;
  classification: number | null;
  returnNumber: number | null;
  rgb: [number, number, number] | null;
}

export interface PointCloudViewState {
  extent: [number, number, number, number];
  resolution: number;
  size: [number, number];
}

export interface PointCloudColorStats {
  zmin: number;
  zmax: number;
}
