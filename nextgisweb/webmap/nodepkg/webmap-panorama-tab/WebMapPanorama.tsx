import { observer } from "mobx-react-lite";
import { Suspense, lazy, useEffect } from "react";

import { useInjection } from "@nextgisweb/pyramid/di";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";

import { panoramaInjection } from "../panorama/PanoramaStore";

import { PANORAMA_TAB_KEY } from "./constant";

const WebMapPanoramaTabLazy = lazy(
  () => import("@nextgisweb/webmap/webmap-panorama-tab")
);

const PanoramaProviderSelectLazy = lazy(() =>
  import("../panorama/PanoramaProviderSelect").then((m) => ({
    default: m.PanoramaProviderSelect,
  }))
);

const PanoramaTabLabel = observer(() => {
  const { display } = useDisplayContext();
  const store = useInjection(panoramaInjection);
  const active = display.tabsManager.activeKey === PANORAMA_TAB_KEY;

  return (
    <Suspense fallback={gettext("Panorama")}>
      <PanoramaProviderSelectLazy
        store={store}
        className="ngw-webmap-panorama-tab-select"
        variant="borderless"
        style={active ? undefined : { pointerEvents: "none" }}
      />
    </Suspense>
  );
});

const getOpened = (tabs: ReadonlyArray<{ key: string }>) =>
  tabs.some((tab) => tab.key === PANORAMA_TAB_KEY);

const WebMapPanorama = observer(() => {
  const { display } = useDisplayContext();
  const { tabsManager } = display;
  const store = useInjection(panoramaInjection);
  const { position } = store;
  const opened = getOpened(tabsManager.tabs);

  useEffect(() => {
    if (!position) {
      tabsManager.removeTab(PANORAMA_TAB_KEY);
      return;
    }

    if (!getOpened(tabsManager.tabs)) {
      tabsManager.addTab({
        key: PANORAMA_TAB_KEY,
        label: <PanoramaTabLabel />,
        component: WebMapPanoramaTabLazy,
      });
    }

    tabsManager.setActiveKey(PANORAMA_TAB_KEY);
  }, [position, tabsManager]);

  useEffect(() => {
    if (!opened && position && !getOpened(tabsManager.tabs)) {
      store.clear();
    }
  }, [opened, position, store, tabsManager]);

  return null;
});

WebMapPanorama.displayName = "WebMapPanorama";
export default WebMapPanorama;
