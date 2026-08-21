import { useCallback, useState } from "react";

import { errorModal } from "@nextgisweb/gui/error";
import { LunkwillParam, route } from "@nextgisweb/pyramid/api";
import type {
  GetRouteParam,
  RouteName,
  RouteResults,
} from "@nextgisweb/pyramid/api/type";
import pyramidSettings from "@nextgisweb/pyramid/client-settings";

export function useArchiveExport<N extends RouteName>(
  name: N,
  params?: GetRouteParam<N>
) {
  const [loading, setLoading] = useState(false);

  const doExport = useCallback(async () => {
    const r = (
      route as (name: N, params?: GetRouteParam<N>) => RouteResults<N>
    )(name, params);
    const apiUrl = (r.url as () => string)();

    if (!pyramidSettings.lunkwill.enabled) {
      window.open(apiUrl);
      return;
    }

    const lunkwillParam = new LunkwillParam();
    lunkwillParam.require();
    setLoading(true);
    try {
      const get = r.get as (opts: {
        lunkwill: LunkwillParam;
        lunkwillReturnUrl: true;
      }) => Promise<string>;
      const respUrl = await get({
        lunkwill: lunkwillParam,
        lunkwillReturnUrl: true,
      });
      window.open(respUrl);
    } catch (err) {
      errorModal(err);
    } finally {
      setLoading(false);
    }
  }, [name, params]);

  return { loading, doExport };
}
