import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, Select, Slider, Space } from "@nextgisweb/gui/antd";
import { CentralLoading } from "@nextgisweb/gui/component";
import { extractError, isAbortError } from "@nextgisweb/gui/error";
import type { PointCloudLayerRead } from "@nextgisweb/point-cloud/type/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import {
  PointCloudViewer,
  UnsupportedCoordinateSystemError,
} from "./viewer/PointCloudViewer";
import type { ColoringMode } from "./viewer/PointCloudViewer";
import {
  createBasemapSource,
  defaultBasemapKey,
  loadBasemapOptions,
} from "./viewer/basemap";
import type { BasemapOption } from "./viewer/basemap";

const msgColoring = gettext("Coloring");
const msgBasemap = gettext("Basemap");
const msgPointSize = gettext("Point size");
const msgNoBasemap = gettext("No basemap");
const msgUnsupportedCrs = gettext(
  "Preview is not available for point clouds in geographic coordinate systems."
);

const NO_BASEMAP = "";
const DEFAULT_POINT_SIZE = 2;

interface PointCloudPreviewProps {
  resourceId: number;
  data: PointCloudLayerRead;
}

function errorText(err: unknown) {
  console.error(err);
  const { title, message } = extractError(err);
  return message ? `${title}: ${message}` : title;
}

function coloringOptions(data: PointCloudLayerRead) {
  const options: { value: ColoringMode; label: string }[] = [];
  if (data.has_rgb) options.push({ value: "rgb", label: gettext("RGB") });
  options.push({ value: "elevation", label: gettext("Elevation") });
  if (data.has_classification) {
    options.push({ value: "classification", label: gettext("Classification") });
  }
  if (data.has_intensity) {
    options.push({ value: "intensity", label: gettext("Intensity") });
  }
  if (data.has_returns) {
    options.push({ value: "return_number", label: gettext("Return number") });
  }
  return options;
}

export default function PointCloudPreview({
  resourceId,
  data,
}: PointCloudPreviewProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<PointCloudViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colorings = useMemo(() => coloringOptions(data), [data]);
  const [coloring, setColoring] = useState<ColoringMode>(colorings[0].value);
  const [pointSize, setPointSize] = useState(DEFAULT_POINT_SIZE);

  const [basemaps, setBasemaps] = useState<BasemapOption[]>([]);
  const [basemapKey, setBasemapKey] = useState<string>(NO_BASEMAP);

  // The viewer is created once and doesn't depend on the controls state
  const initialColoring = useRef(coloring);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    let instance: PointCloudViewer;
    try {
      instance = new PointCloudViewer({
        target,
        resourceId,
        data,
        coloring: initialColoring.current,
      });
    } catch (err) {
      setError(
        err instanceof UnsupportedCoordinateSystemError
          ? msgUnsupportedCrs
          : errorText(err)
      );
      setLoading(false);
      return;
    }

    setViewer(instance);
    instance
      .load()
      .catch((err) => setError(errorText(err)))
      .finally(() => setLoading(false));

    return () => {
      setViewer(null);
      instance.dispose();
    };
  }, [resourceId, data]);

  useEffect(() => {
    const ac = new AbortController();
    loadBasemapOptions(ac.signal)
      .then((options) => {
        setBasemaps(options);
        setBasemapKey(defaultBasemapKey(options) ?? NO_BASEMAP);
      })
      .catch((err) => {
        if (!isAbortError(err)) console.error(err);
      });
    return () => ac.abort();
  }, []);

  const basemap = basemaps.find((b) => b.key === basemapKey);

  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    (async () => {
      const source = basemap ? await createBasemapSource(basemap.config) : null;
      if (!cancelled) await viewer.setBasemap(source);
    })().catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [viewer, basemap]);

  useEffect(() => {
    viewer?.setColoring(coloring);
  }, [viewer, coloring]);

  useEffect(() => {
    viewer?.setPointSize(pointSize);
  }, [viewer, pointSize]);

  const basemapOptions = useMemo(
    () => [
      { value: NO_BASEMAP, label: msgNoBasemap },
      ...basemaps.map((b) => ({ value: b.key, label: b.label })),
    ],
    [basemaps]
  );

  return (
    <div className="ngw-point-cloud-preview">
      <Space wrap className="toolbar">
        <Space>
          {msgColoring}
          <Select
            value={coloring}
            onChange={setColoring}
            options={colorings}
            popupMatchSelectWidth={false}
          />
        </Space>
        <Space>
          {msgBasemap}
          <Select
            value={basemapKey}
            onChange={setBasemapKey}
            options={basemapOptions}
            popupMatchSelectWidth={false}
          />
        </Space>
        <Space>
          {msgPointSize}
          <Slider
            className="point-size"
            min={1}
            max={8}
            step={0.5}
            value={pointSize}
            onChange={setPointSize}
          />
        </Space>
      </Space>
      {error && <Alert type="error" title={error} showIcon />}
      <div className="ngw-point-cloud-preview-canvas">
        {/* Giro3D expects an empty target element */}
        <div className="target" ref={targetRef} />
        {loading && (
          <CentralLoading style={{ position: "absolute", inset: 0 }} />
        )}
      </div>
      {basemap?.config.copyright_text && (
        <div className="attribution">{basemap.config.copyright_text}</div>
      )}
    </div>
  );
}
