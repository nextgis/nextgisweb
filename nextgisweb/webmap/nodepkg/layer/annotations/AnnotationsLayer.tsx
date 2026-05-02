import type Feature from "ol/Feature";
import { WKT } from "ol/format";
import type VectorSource from "ol/source/Vector";
import { lazy, useCallback, useEffect, useRef, useState } from "react";

import { useShowModal } from "@nextgisweb/gui";
import { errorModal } from "@nextgisweb/gui/error";
import { assert } from "@nextgisweb/jsrealm/error";
import { route } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook";
import { useMapContext } from "@nextgisweb/webmap/map-component/context/useMapContext";
import type { AnnotationCreate } from "@nextgisweb/webmap/type/api";

import VectorLayerClass from "../../ol/layer/Vector";

import { AnnotationFeature } from "./AnnotationFeature";
import type { AnnotationInfo } from "./AnnotationFeature";
import { AnnotationsEditableLayer } from "./AnnotationsEditableLayer";
import type { AnnotationGeometryType } from "./AnnotationsEditableLayer";
import { AnnotationsPopup } from "./AnnotationsPopup";

export type AnnotationVisibleMode = "no" | "yes" | "messages";

const AnnotationsModalLazy = lazy(
  () => import("@nextgisweb/webmap/ui/annotation-dialog")
);

export interface AccessFilter {
  own: boolean;
  public: boolean;
  private: boolean;
}

interface DialogEditResult {
  action: "undo" | "delete";
  annFeature: AnnotationFeature;
}

interface DialogSaveResult {
  action: "save";
  newData: AnnotationInfo;
  annFeature: AnnotationFeature;
}

type DialogResult = DialogEditResult | DialogSaveResult;

function annotationVisible(annot: AnnotationVisibleMode) {
  return annot === "yes" || annot === "messages";
}

interface AnnotationsLayerComponentProps {
  filter: AccessFilter;
  webmapId: number;
  editable: boolean;
  visibleMode: AnnotationVisibleMode;
  activeGeometryType: AnnotationGeometryType | null;
}

export function AnnotationsLayer({
  filter,
  editable,
  webmapId,
  visibleMode,
  activeGeometryType,
}: AnnotationsLayerComponentProps) {
  const layerRef = useRef<VectorLayerClass | null>(null);
  const sourceRef = useRef<VectorSource | null>(null);
  const filterRef = useRef(filter);
  const loadTokenRef = useRef(0);
  const visibleModeRef = useRef(visibleMode);
  const popupsVisibleRef = useRef<boolean | null>(null);

  const [source, setSource] = useState<VectorSource | null>(null);
  const [popupFeatures, setPopupFeatures] = useState<AnnotationFeature[]>([]);

  const { showModal, modalHolder } = useShowModal();
  const { mapStore } = useMapContext();
  const { makeSignal } = useAbortController();

  const isStale = useCallback(
    (loadToken: number, source: VectorSource): boolean => {
      return loadToken !== loadTokenRef.current || sourceRef.current !== source;
    },
    []
  );

  const syncPopupFeatures = useCallback(() => {
    const source = sourceRef.current;

    if (!source || !popupsVisibleRef.current) {
      setPopupFeatures([]);
      return;
    }

    const nextPopupFeatures = source
      .getFeatures()
      .flatMap((feature): AnnotationFeature[] => {
        const annFeature = feature.get("annFeature") as
          | AnnotationFeature
          | undefined;
        const accessType = annFeature?.getAccessType();

        if (!annFeature || !accessType || !filterRef.current[accessType]) {
          return [];
        }

        return [annFeature];
      });

    setPopupFeatures(nextPopupFeatures);
  }, []);

  const redrawFilter = useCallback((): void => {
    const source = sourceRef.current;

    if (!source) {
      return;
    }

    source.getFeatures().forEach((feature: Feature) => {
      const annFeature = feature.get("annFeature") as AnnotationFeature;
      const accessType = annFeature.getAccessType();

      if (!accessType) return;

      const visible = filterRef.current[accessType];

      annFeature.toggleVisible(visible);
    });
    syncPopupFeatures();
  }, [syncPopupFeatures]);

  const applyFilter = useCallback(
    (filter: AccessFilter) => {
      filterRef.current = filter;
      redrawFilter();
    },
    [redrawFilter]
  );

  const showPopups = useCallback(() => {
    popupsVisibleRef.current = true;
    syncPopupFeatures();
  }, [syncPopupFeatures]);

  const showPopup = useCallback((annotationFeature: AnnotationFeature) => {
    const accessType = annotationFeature.getAccessType();

    if (!accessType || !filterRef.current[accessType]) {
      return;
    }

    setPopupFeatures((features) =>
      features.includes(annotationFeature)
        ? features
        : [...features, annotationFeature]
    );
  }, []);

  const hidePopups = useCallback(() => {
    popupsVisibleRef.current = false;
    syncPopupFeatures();
  }, [syncPopupFeatures]);

  const removeAnnFeature = useCallback((annFeature: AnnotationFeature) => {
    const olFeature = annFeature.getFeature();
    if (olFeature) {
      sourceRef.current?.removeFeature(olFeature);
      setPopupFeatures((features) =>
        features.filter((feature) => feature !== annFeature)
      );
      annFeature.clearOlFeature();
    }
  }, []);

  const syncVisibleMode = useCallback(
    (annotVisibleState: AnnotationVisibleMode) => {
      const layer = layerRef.current;

      if (!layer) {
        return;
      }

      layer.getLayer().setVisible(annotationVisible(annotVisibleState));

      if (annotVisibleState === "messages") {
        showPopups();
      } else {
        hidePopups();
      }
    },
    [hidePopups, showPopups]
  );

  const getAnnotation = useCallback(
    (annotationId: number): Promise<AnnotationInfo> => {
      return route("webmap.annotation.item", {
        id: webmapId,
        annotation_id: annotationId,
      }).get({ signal: makeSignal() });
    },
    [webmapId, makeSignal]
  );

  const createAnnotation = useCallback(
    async (
      annFeature: AnnotationFeature,
      newAnnotationInfo: AnnotationInfo
    ): Promise<void> => {
      const source = sourceRef.current;
      const loadToken = loadTokenRef.current;

      if (!source) {
        return;
      }

      try {
        const wkt = new WKT();
        const geometry = annFeature.getFeature()?.getGeometry();

        if (!geometry) {
          throw new Error("There is no geometry in annotation feature");
        }

        newAnnotationInfo.geom = wkt.writeGeometry(geometry);

        const createInfo = await route("webmap.annotation.collection", {
          id: webmapId,
        }).post({
          json: newAnnotationInfo as AnnotationCreate,
        });
        const annotationInfo = await getAnnotation(createInfo.id);

        if (isStale(loadToken, source)) {
          return;
        }

        annFeature.updateAnnotationInfo(annotationInfo);

        if (visibleModeRef.current === "messages") {
          showPopup(annFeature);
        }

        redrawFilter();
      } catch (err) {
        if (!isStale(loadToken, source)) {
          errorModal(err);
          throw err;
        }
      }
    },
    [webmapId, getAnnotation, isStale, redrawFilter, showPopup]
  );

  const updateAnnotation = useCallback(
    async (
      annFeature: AnnotationFeature,
      newAnnotationInfo: AnnotationInfo
    ): Promise<void> => {
      const source = sourceRef.current;
      const loadToken = loadTokenRef.current;

      if (!source) {
        return;
      }

      try {
        const annotationId = annFeature.getId();
        assert(annotationId);

        const updateInfo = await route("webmap.annotation.item", {
          id: webmapId,
          annotation_id: Number(annotationId),
        }).put({
          json: newAnnotationInfo,
        });
        const annotationInfo = await getAnnotation(updateInfo.id);

        if (isStale(loadToken, source)) {
          return;
        }

        annFeature.updateAnnotationInfo(annotationInfo);
        redrawFilter();
      } catch (err) {
        if (!isStale(loadToken, source)) {
          errorModal(err);
          throw err;
        }
      }
    },
    [webmapId, getAnnotation, isStale, redrawFilter]
  );

  const deleteAnnotation = useCallback(
    async (annFeature: AnnotationFeature): Promise<void> => {
      const source = sourceRef.current;
      const loadToken = loadTokenRef.current;

      if (!source) {
        return;
      }

      try {
        const annotationId = annFeature.getId();

        if (annotationId !== undefined) {
          await route("webmap.annotation.item", {
            id: webmapId,
            annotation_id: Number(annotationId),
          }).delete();
        }

        if (isStale(loadToken, source)) {
          return;
        }

        removeAnnFeature(annFeature);
      } catch (err) {
        if (!isStale(loadToken, source)) {
          errorModal(err);
          throw err;
        }
      }
    },
    [webmapId, isStale, removeAnnFeature]
  );

  const dialogResultHandle = useCallback(
    async (result: DialogResult): Promise<void> => {
      if (!sourceRef.current) {
        return;
      }

      const annFeature = result.annFeature;

      if (result.action === "save") {
        if (annFeature.isNew()) {
          await createAnnotation(annFeature, result.newData);
        } else {
          await updateAnnotation(annFeature, result.newData);
        }
      }

      if (result.action === "undo" && annFeature.isNew()) {
        removeAnnFeature(annFeature);
      }

      if (result.action === "delete") {
        await deleteAnnotation(annFeature);
      }
    },
    [createAnnotation, deleteAnnotation, removeAnnFeature, updateAnnotation]
  );

  const showForEdit = useCallback(
    (annFeature: AnnotationFeature): Promise<DialogResult> => {
      return new Promise((resolve) => {
        showModal(AnnotationsModalLazy, {
          annFeature,
          onSave: (data) => {
            resolve({ action: "save", annFeature, newData: data });
          },
          onDelete: () => {
            resolve({ action: "delete", annFeature });
          },
          onCreate: (newData) => {
            resolve({ action: "save", annFeature, newData });
          },
          onCancel: () => {
            resolve({ action: "undo", annFeature });
          },
        });
      });
    },
    [showModal]
  );

  const onChangeAnnotation = useCallback(
    (annFeature: AnnotationFeature) => {
      showForEdit(annFeature).then(dialogResultHandle);
    },
    [dialogResultHandle, showForEdit]
  );

  const onCreateOlFeature = useCallback(
    (olFeature: Feature) => {
      const annFeature = new AnnotationFeature({
        feature: olFeature,
      });

      showForEdit(annFeature).then(dialogResultHandle);
    },
    [dialogResultHandle, showForEdit]
  );

  const fillAnnotations = useCallback(
    (annotationsInfo: AnnotationInfo[]) => {
      const source = sourceRef.current;

      if (!source) {
        return;
      }

      annotationsInfo
        .map(
          (annotationInfo) =>
            new AnnotationFeature({
              annotationInfo,
            })
        )
        .forEach((annotationFeature) => {
          const feature = annotationFeature.getFeature();
          if (feature) {
            source.addFeature(feature);
          }
        });

      redrawFilter();
    },
    [redrawFilter]
  );

  useEffect(() => {
    visibleModeRef.current = visibleMode;
    syncVisibleMode(visibleMode);
  }, [syncVisibleMode, visibleMode]);

  useEffect(() => {
    applyFilter(filter);
  }, [applyFilter, filter]);

  useEffect(() => {
    const layer = new VectorLayerClass("annotations", {
      title: "annotations",
      visible: annotationVisible(visibleModeRef.current),
      isTopLayer: true,
    });
    const source = layer.getSource();

    mapStore.addLayer(layer);

    sourceRef.current = source;
    layerRef.current = layer;
    setSource(source);
    applyFilter(filterRef.current);

    const loadToken = ++loadTokenRef.current;
    route("webmap.annotation.collection", {
      id: webmapId,
    })
      .get({ signal: makeSignal() })
      .then((annotations) => {
        if (isStale(loadToken, source)) {
          return;
        }

        fillAnnotations(annotations as AnnotationInfo[]);
        syncVisibleMode(visibleModeRef.current);
      })
      .catch((err) => {
        if (!isStale(loadToken, source)) {
          errorModal(err);
        }
      });

    return () => {
      loadTokenRef.current = loadToken + 1;
      if (sourceRef.current === source) {
        sourceRef.current = null;
      }
      if (layerRef.current === layer) {
        layerRef.current = null;
      }
      source.clear();
      popupsVisibleRef.current = false;
      setPopupFeatures([]);
      mapStore.removeLayer(layer);
      layer.dispose();
    };
  }, [
    webmapId,
    mapStore,
    isStale,
    makeSignal,
    applyFilter,
    fillAnnotations,
    syncVisibleMode,
  ]);

  if (!source) {
    return <>{modalHolder}</>;
  }

  return (
    <>
      <AnnotationsEditableLayer
        activeGeometryType={activeGeometryType}
        onCreateOlFeature={onCreateOlFeature}
        editable={editable}
        mapStore={mapStore}
        source={source}
      />
      {popupFeatures.map((annFeature, index) => (
        <AnnotationsPopup
          key={annFeature.getId() ?? index}
          annFeature={annFeature}
          editable={editable}
          map={mapStore}
          onChange={onChangeAnnotation}
        />
      ))}
      {modalHolder}
    </>
  );
}
