import type { Options as ImageWMSOptions } from "ol/source/ImageWMS";
import { getUid } from "ol/util";
import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, Col, Row, Select, Typography } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { isAbortError } from "@nextgisweb/gui/error";
import type { Extent } from "@nextgisweb/layer/type/api";
import { routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import {
  imageQueue,
  tileLoadFunction,
  transparentImage,
} from "@nextgisweb/pyramid/util";
import { URLLayer } from "@nextgisweb/webmap/map-component";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import Image from "@nextgisweb/webmap/ol/layer/Image";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import {
  appendPreviewPostprocessParam,
  buildPreviewPostprocessParam,
} from "./postprocess";
import type { PreviewPostprocess } from "./postprocess";
import "./EffectsPreview.less";

const PREVIEW_DEBOUNCE_MS = 200;
const PREVIEW_HEIGHT = 320;
const SECTION_GUTTER: [number, number] = [10, 5];

const { Text, Title } = Typography;

const msgPreview = gettext("Preview");
const msgPreviewHint = gettext(
  "Updates automatically as effects are adjusted."
);
const msgPreviewUnavailable = gettext(
  "A preview map with effects will be available after the style is created."
);
const msgImageAdapter = gettext("Image Adapter");
const msgTileAdapter = gettext("Tile Adapter");

const previewModeOptions = [
  { value: "image", label: msgImageAdapter },
  { value: "tile", label: msgTileAdapter },
];

export type EffectsPreviewMode = "image" | "tile";

export interface EffectsPreviewProps {
  resourceId: number | null;
  postprocess: PreviewPostprocess;
  mode?: EffectsPreviewMode;
  onModeChange?: (mode: EffectsPreviewMode) => void;
}

function buildImagePreviewUrl(
  resourceId: number,
  postprocess: PreviewPostprocess
) {
  const url = new URL(routeURL("render.image"), window.location.origin);
  url.searchParams.set("resource", String(resourceId));
  url.searchParams.set("nd", "204");

  appendPreviewPostprocessParam(url.searchParams, resourceId, postprocess);

  return url.toString();
}

function buildTilePreviewUrl(
  resourceId: number,
  postprocess: PreviewPostprocess
) {
  const baseUrl = new URL(routeURL("render.tile"), window.location.origin);
  let url =
    `${baseUrl.toString()}?z={z}&x={x}&y={y}` +
    `&resource=${resourceId}&nd=204`;

  const param = buildPreviewPostprocessParam(resourceId, postprocess);
  if (param !== null) {
    url += `&${param.name}=` + encodeURIComponent(param.value);
  }

  return url;
}

function buildRenderedImageUrl(
  baseUrl: string,
  resourceId: number,
  bbox: string,
  width: string,
  height: string,
  postprocess: PreviewPostprocess
) {
  const url = new URL(baseUrl);
  url.searchParams.set("resource", String(resourceId));
  url.searchParams.set("extent", bbox);
  url.searchParams.set("size", `${width},${height}`);
  url.searchParams.set("nd", "204");

  appendPreviewPostprocessParam(url.searchParams, resourceId, postprocess);

  return url.toString();
}

function EffectsPreviewImageLayer({
  resourceId,
  postprocess,
}: {
  resourceId: number;
  postprocess: PreviewPostprocess;
}) {
  const { mapStore } = useMapContext();
  const layerRef = useRef<Image | undefined>(undefined);
  const previewUrl = useMemo(
    () => buildImagePreviewUrl(resourceId, postprocess),
    [postprocess, resourceId]
  );

  useEffect(() => {
    const imageLayer = new Image(
      `effects-preview-${resourceId}`,
      {
        opacity: 1,
        visible: true,
      },
      {
        url: previewUrl,
        params: {
          resource: resourceId,
        },
        ratio: 1,
        crossOrigin: "anonymous",
        imageLoadFunction: function (imageWrapper, src) {
          const [url, query = ""] = src.split("?");
          const searchParams = new URLSearchParams(query);
          const bbox = searchParams.get("BBOX");
          const width = searchParams.get("WIDTH");
          const height = searchParams.get("HEIGHT");

          if (bbox === null || width === null || height === null) {
            const img = imageWrapper.getImage() as HTMLImageElement;
            img.src = transparentImage;
            return;
          }

          const nextSrc = buildRenderedImageUrl(
            url,
            resourceId,
            bbox,
            width,
            height,
            postprocess
          );

          const img = imageWrapper.getImage() as HTMLImageElement;
          const id = getUid(this);

          setTimeout(() => {
            imageQueue.add(
              ({ signal }) =>
                tileLoadFunction({
                  src: nextSrc,
                  cache: "no-cache",
                  signal,
                })
                  .then((imageUrl) => {
                    img.src = imageUrl;
                  })
                  .catch((error) => {
                    if (!isAbortError(error)) {
                      console.error(error);
                    }
                    img.src = transparentImage;
                  }),
              { id }
            );
          });
        },
      } satisfies ImageWMSOptions
    );

    layerRef.current = imageLayer;
    imageLayer.setZIndex(1);
    mapStore.addLayer(imageLayer);

    return () => {
      layerRef.current?.dispose();
      layerRef.current = undefined;
    };
  }, [mapStore, postprocess, previewUrl, resourceId]);

  return null;
}

function EffectsPreviewTileLayer({
  resourceId,
  postprocess,
}: {
  resourceId: number;
  postprocess: PreviewPostprocess;
}) {
  const tileUrl = useMemo(
    () => buildTilePreviewUrl(resourceId, postprocess),
    [postprocess, resourceId]
  );

  return <URLLayer url={tileUrl} />;
}

export function EffectsPreview({
  resourceId,
  postprocess,
  mode = "image",
  onModeChange,
}: EffectsPreviewProps) {
  const [debouncedPostprocess, setDebouncedPostprocess] = useState(postprocess);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedPostprocess(postprocess);
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [postprocess]);

  const { data: extentData, isLoading } = useRouteGet<Extent>({
    name: "layer.extent",
    params: { id: resourceId ?? 0 },
    enabled: resourceId !== null,
  });

  const padding = useMemo(() => [20, 20, 20, 20], []);
  const mapExtent = useMemo(
    () =>
      extentData
        ? {
            extent: extentData.extent,
            srs: { id: 4326 },
            padding,
          }
        : undefined,
    [extentData, padding]
  );

  const showPreviewMap = resourceId !== null && !isLoading;

  return (
    <div className="ngw-render-effects-preview">
      <div className="section">
        <Title level={4} className="title">
          {msgPreview}
        </Title>
        {showPreviewMap && (
          <Row gutter={SECTION_GUTTER} align="middle">
            <Col flex="auto">
              <Text type="secondary">{msgPreviewHint}</Text>
            </Col>
            <Col className="mode-selector-col">
              <Select
                style={{ width: "100%" }}
                value={mode}
                options={previewModeOptions}
                onChange={(next: EffectsPreviewMode) => onModeChange?.(next)}
              />
            </Col>
          </Row>
        )}
      </div>

      {resourceId === null ? (
        <div className="section">
          <Alert showIcon type="info" title={msgPreviewUnavailable} />
        </div>
      ) : (
        <div className="surface">
          {isLoading ? (
            <div className="placeholder">
              <LoadingWrapper rows={6} />
            </div>
          ) : (
            <PreviewMap
              basemap
              mapExtent={mapExtent}
              style={{ height: PREVIEW_HEIGHT }}
            >
              {mode === "tile" ? (
                <EffectsPreviewTileLayer
                  resourceId={resourceId}
                  postprocess={debouncedPostprocess}
                />
              ) : (
                <EffectsPreviewImageLayer
                  resourceId={resourceId}
                  postprocess={debouncedPostprocess}
                />
              )}
            </PreviewMap>
          )}
        </div>
      )}
    </div>
  );
}
