import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import {
  Alert,
  Button,
  Flex,
  InputNumber,
  Select,
  Slider,
  Space,
  Switch,
  Tooltip,
} from "@nextgisweb/gui/antd";
import { CentralLoading } from "@nextgisweb/gui/component";
import { extractError, isAbortError } from "@nextgisweb/gui/error";
import settings from "@nextgisweb/point-cloud/client-settings";
import type { PointCloudLayerRead } from "@nextgisweb/point-cloud/type/api";
import pyramidSettings from "@nextgisweb/pyramid/client-settings";
import { gettext } from "@nextgisweb/pyramid/i18n";

import {
  DEFAULT_EDL_RADIUS,
  DEFAULT_EDL_STRENGTH,
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

import RestartIcon from "@nextgisweb/icon/material/restart_alt";

const msgColoring = gettext("Coloring");
const msgBasemap = gettext("Basemap");
const msgPointSize = gettext("Point size");
const msgAuto = gettext("Auto");
const msgShading = gettext("Shading");
const msgEdgeWidth = gettext("Edge width");
const msgNoBasemap = gettext("No basemap");
const msgTerrain = gettext("Terrain");
const msgOffset = gettext("Offset");
const msgResetOffset = gettext("Reset offset");
const msgMeters = gettext("m");

const msgUnsupportedCrs = gettext(
  "Preview is not available for point clouds in geographic coordinate systems."
);

const NO_BASEMAP = "";
// Zero lets Giro3D size points automatically, it also gives the densest level
// of detail as the point size is a part of the screen space error
const DEFAULT_POINT_SIZE = 0;

/** Marks the default value on a slider, empty labels are ignored by antd */
function defaultMark(value: number) {
  return { [value]: " " };
}

const SAFE_URL_RE = new RegExp(pyramidSettings.urlSafePattern);

interface Attribution {
  text: string;
  url?: string | null;
}

/** Data source attributions in the map corner, as OSM requires */
function Attributions({ items }: { items: Attribution[] }) {
  if (!items.length) return null;
  return (
    <div className="attribution">
      {items.map(({ text, url }, idx) => (
        <Fragment key={idx}>
          {idx > 0 && " | "}
          {url && SAFE_URL_RE.test(url) ? (
            <a href={url} target="_blank" rel="noopener noreferrer">
              {text}
            </a>
          ) : (
            text
          )}
        </Fragment>
      ))}
    </div>
  );
}

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
  const [edlStrength, setEDLStrength] = useState(DEFAULT_EDL_STRENGTH);
  const [edlRadius, setEDLRadius] = useState(DEFAULT_EDL_RADIUS);

  const [basemaps, setBasemaps] = useState<BasemapOption[]>([]);
  const [basemapKey, setBasemapKey] = useState<string>(NO_BASEMAP);
  const [terrain, setTerrain] = useState(false);
  const [offset, setOffset] = useState(0);

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
    if (!viewer) return;
    viewer
      .setTerrain(terrain && settings.terrain ? settings.terrain.url : null)
      .catch((err) => console.error(err));
  }, [viewer, terrain]);

  useEffect(() => {
    viewer?.setVerticalOffset(offset);
  }, [viewer, offset]);

  useEffect(() => {
    viewer?.setColoring(coloring);
  }, [viewer, coloring]);

  useEffect(() => {
    viewer?.setPointSize(pointSize);
  }, [viewer, pointSize]);

  useEffect(() => {
    viewer?.setEDLStrength(edlStrength);
  }, [viewer, edlStrength]);

  useEffect(() => {
    viewer?.setEDLRadius(edlRadius);
  }, [viewer, edlRadius]);

  const attributions: Attribution[] = [];
  if (basemap?.config.copyright_text) {
    const { copyright_text: text, copyright_url: url } = basemap.config;
    attributions.push({ text, url });
  }
  if (terrain && settings.terrain?.copyright_text) {
    const { copyright_text: text, copyright_url: url } = settings.terrain;
    attributions.push({ text, url });
  }

  const basemapOptions = useMemo(
    () => [
      { value: NO_BASEMAP, label: msgNoBasemap },
      ...basemaps.map((b) => ({ value: b.key, label: b.label })),
    ],
    [basemaps]
  );

  return (
    <div className="ngw-point-cloud-preview">
      <Flex className="toolbar" wrap justify="space-between" gap="small">
        <Space wrap>
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
        </Space>
        {settings.terrain && (
          <Space wrap>
            <Space>
              {msgTerrain}
              <Switch checked={terrain} onChange={setTerrain} />
            </Space>
            <Space>
              {msgOffset}
              <InputNumber
                className="offset-input"
                step={0.5}
                value={offset}
                onChange={(value) => setOffset(value ?? 0)}
                suffix={msgMeters}
                disabled={!terrain}
              />
              <Tooltip title={msgResetOffset}>
                <Button
                  icon={<RestartIcon />}
                  disabled={!terrain || offset === 0}
                  onClick={() => setOffset(0)}
                />
              </Tooltip>
            </Space>
          </Space>
        )}
      </Flex>
      {error && <Alert type="error" title={error} showIcon />}
      <div className="ngw-point-cloud-preview-canvas">
        {/* Giro3D expects an empty target element */}
        <div className="target" ref={targetRef} />
        {loading && (
          <CentralLoading style={{ position: "absolute", inset: 0 }} />
        )}
        <div className="display-settings">
          {msgPointSize}
          <Slider
            min={0}
            max={8}
            step={0.5}
            value={pointSize}
            onChange={setPointSize}
            marks={defaultMark(DEFAULT_POINT_SIZE)}
            tooltip={{ formatter: (v) => (v ? v : msgAuto) }}
          />
          {msgShading}
          <Slider
            min={0}
            max={5}
            step={0.1}
            value={edlStrength}
            onChange={setEDLStrength}
            marks={defaultMark(DEFAULT_EDL_STRENGTH)}
          />
          {msgEdgeWidth}
          <Slider
            min={0.5}
            max={4}
            step={0.1}
            value={edlRadius}
            onChange={setEDLRadius}
            marks={defaultMark(DEFAULT_EDL_RADIUS)}
          />
        </div>
        <Attributions items={attributions} />
      </div>
    </div>
  );
}
