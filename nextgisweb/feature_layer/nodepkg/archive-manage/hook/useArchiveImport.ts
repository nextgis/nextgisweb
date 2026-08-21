import { useCallback, useState } from "react";

import { fileUploader } from "@nextgisweb/file-upload";
import { errorModal } from "@nextgisweb/gui/error";
import { LunkwillParam, route } from "@nextgisweb/pyramid/api";
import type {
  GetRouteParam,
  RouteBody,
  RouteName,
  RouteResults,
} from "@nextgisweb/pyramid/api/type";

export function useArchiveImport<N extends RouteName>(
  name: N,
  params?: GetRouteParam<N>
) {
  const [loading, setLoading] = useState(false);

  const doImport = useCallback(
    async (file: File, replace: boolean | undefined) => {
      const r = (
        route as (name: N, params?: GetRouteParam<N>) => RouteResults<N>
      )(name, params);
      setLoading(true);
      try {
        const [source] = await fileUploader({ files: [file] });
        const lunkwillParam = new LunkwillParam();
        lunkwillParam.suggest();
        return await r.put({
          json: { source, replace } as RouteBody<N, "put">,
          lunkwill: lunkwillParam,
        });
      } catch (err) {
        errorModal(err);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [name, params]
  );

  return { loading, doImport };
}
