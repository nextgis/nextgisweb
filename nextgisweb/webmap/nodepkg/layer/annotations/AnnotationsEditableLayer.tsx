import { observer } from "mobx-react-lite";
import type { Feature } from "ol";
import type OlMap from "ol/Map";
import { never } from "ol/events/condition";
import { Draw } from "ol/interaction";
import type { Vector as VectorSource } from "ol/source";
import { useCallback, useEffect, useRef } from "react";

import { ANNOTATION_ADD_ID } from "@nextgisweb/webmap/constant";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import VectorLayerClass from "../../ol/layer/Vector";

export const annotationGeometryTypes = [
  "Point",
  "LineString",
  "Polygon",
] as const;

export type AnnotationGeometryType = (typeof annotationGeometryTypes)[number];

interface AnnotationsEditableLayerComponentProps {
  source: VectorSource;
  editable: boolean;
  mapStore: MapStore;
  olMap: OlMap;
  activeGeometryType: AnnotationGeometryType | null;
  onCreateOlFeature: (olFeature: Feature) => void;
}

export function AnnotationsEditableLayerInner({
  source,
  editable,
  mapStore,
  olMap,
  activeGeometryType,
  onCreateOlFeature,
}: AnnotationsEditableLayerComponentProps) {
  const { adapter } = mapStore;
  const drawRef = useRef<Draw | null>(null);
  const editActiveRef = useRef(false);
  const overlayLayerRef = useRef<VectorLayerClass | null>(null);
  const activeSourceRef = useRef<VectorSource | null>(null);

  const removeInteraction = useCallback((): void => {
    if (drawRef.current) {
      olMap.removeInteraction(drawRef.current);
      drawRef.current = null;
    }
  }, [olMap]);

  const deactivate = useCallback((): void => {
    removeInteraction();
    if (overlayLayerRef.current) {
      mapStore.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }
    activeSourceRef.current = null;
  }, [mapStore, removeInteraction]);

  const addInteraction = useCallback(
    (source: VectorSource, geometryType: AnnotationGeometryType): void => {
      const draw = new Draw({
        source,
        type: geometryType,
        freehandCondition: never,
      });

      draw.on("drawend", (e: { feature: Feature }) => {
        onCreateOlFeature(e.feature);
      });

      olMap.addInteraction(draw);
      draw.setActive(true);
      drawRef.current = draw;
    },
    [olMap, onCreateOlFeature]
  );

  const activate = useCallback(
    (source: VectorSource, geometryType: AnnotationGeometryType): void => {
      const overlayLayer = new VectorLayerClass("editor.overlay", {
        title: "editor.overlay",
        isTopLayer: true,
      });

      overlayLayer.getLayer().setSource(source);
      mapStore.addLayer(overlayLayer, undefined, adapter);
      overlayLayerRef.current = overlayLayer;
      activeSourceRef.current = source;
      addInteraction(source, geometryType);
    },
    [addInteraction, mapStore, adapter]
  );

  const changeGeometryType = useCallback(
    (geometryType: AnnotationGeometryType): void => {
      const source = activeSourceRef.current;

      if (!source) {
        return;
      }

      removeInteraction();
      addInteraction(source, geometryType);
    },
    [addInteraction, removeInteraction]
  );

  useEffect(() => {
    return () => {
      deactivate();
      editActiveRef.current = false;
      mapStore.deactivateMapState(ANNOTATION_ADD_ID);
    };
  }, [deactivate, mapStore]);

  useEffect(() => {
    if (!activeGeometryType || !editable) {
      deactivate();
      editActiveRef.current = false;
      return;
    }

    if (editActiveRef.current && activeSourceRef.current === source) {
      changeGeometryType(activeGeometryType);
    } else {
      deactivate();
      activate(source, activeGeometryType);
      editActiveRef.current = true;
    }
  }, [
    activate,
    activeGeometryType,
    changeGeometryType,
    deactivate,
    editable,
    source,
  ]);

  return null;
}

export const AnnotationsEditableLayer = observer(AnnotationsEditableLayerInner);
