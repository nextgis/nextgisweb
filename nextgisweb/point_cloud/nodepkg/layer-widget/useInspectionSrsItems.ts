import { useCallback, useMemo } from "react";

import { useAbortController } from "@nextgisweb/pyramid/hook";
import type { SrsSelectItem } from "@nextgisweb/spatial-ref-sys/srs-select-expandable";

import type { EditorStore } from "./EditorStore";
import { formatCrs } from "./util";

export function useInspectionSrsItems(store: EditorStore) {
  const { makeSignal } = useAbortController();
  const inspection = store.currentInspection;

  // Only coordinate systems equivalent to the file one can be selected,
  // as the point cloud is not reprojected
  const srsItems = useMemo<SrsSelectItem[] | undefined>(() => {
    const crs = inspection?.crs;
    if (!inspection || !crs) return undefined;
    if (inspection.srs_candidates.length) {
      return inspection.srs_candidates.map((srs) => ({
        id: srs.id,
        label: srs.display_name,
      }));
    }
    return [
      {
        label: formatCrs(crs.display_name, crs.auth),
        code: crs.auth ?? undefined,
      },
    ];
  }, [inspection]);

  const refresh = useCallback(async () => {
    const { source } = store;
    if (source) {
      await store.inspectSource(source.id, makeSignal());
    } else {
      await store.loadStoredInspection(makeSignal());
    }
  }, [store, makeSignal]);

  return { srsItems, refresh };
}
