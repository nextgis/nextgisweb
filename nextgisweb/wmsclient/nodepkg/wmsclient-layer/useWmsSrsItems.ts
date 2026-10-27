import { useEffect, useMemo } from "react";

import { useRouteGet } from "@nextgisweb/pyramid/hook";
import type { SrsSelectItem } from "@nextgisweb/spatial-ref-sys/srs-select-expandable";

import type { WmsClientLayerStore } from "./WmsClientLayerStore";

export interface UseWmsSrsItemsProps {
  wmsSrsCodes: string[] | null | undefined;
  remoteSrs: WmsClientLayerStore["remote_srs"];
}

export function useWmsSrsItems({
  wmsSrsCodes,
  remoteSrs,
}: UseWmsSrsItemsProps) {
  const initialId = remoteSrs.initial?.id;

  const { data: localSrsList, refresh } = useRouteGet(
    "spatial_ref_sys.collection"
  );

  const srsItems = useMemo<SrsSelectItem[] | undefined>(() => {
    if (wmsSrsCodes === undefined || !localSrsList) return undefined;

    if (wmsSrsCodes === null) {
      const id = initialId ?? 3857;
      const local = localSrsList.find((s) => s.id === id);
      return local ? [{ id: local.id, label: local.display_name }] : [];
    }

    return wmsSrsCodes.flatMap((code) => {
      const match = code.match(/^([A-Z]+):(\d+)$/i);
      if (!match) return [];
      const [, authName, authSrid] = match;
      const local = localSrsList.find(
        (s) =>
          s.auth_name?.toUpperCase() === authName.toUpperCase() &&
          s.auth_srid === parseInt(authSrid)
      );
      return [
        local
          ? { id: local.id, label: local.display_name }
          : { label: code, code },
      ];
    });
  }, [wmsSrsCodes, localSrsList, initialId]);

  useEffect(() => {
    if (!srsItems) return;
    const ids = srsItems.flatMap(({ id }) => (id !== undefined ? [id] : []));
    const current = remoteSrs.value?.id;
    if (current !== undefined && ids.includes(current)) return;
    remoteSrs.value = ids.includes(3857) ? { id: 3857 } : null;
  }, [srsItems, remoteSrs]);

  return { srsItems, refresh };
}
