import { useCallback, useMemo } from "react";

import { cache } from "@nextgisweb/pyramid/api/cache";
import { useRoute } from "@nextgisweb/pyramid/hook";
import type { CompositeSetup } from "@nextgisweb/resource/composite/CompositeStore";
import { CompositeWidgetModal } from "@nextgisweb/resource/composite/CompositeWidgetModal";
import type { CompositeWidgetModalProps } from "@nextgisweb/resource/composite/CompositeWidgetModal";
import type { Display } from "@nextgisweb/webmap/display";

export function WebmapEditorModal({
  display,
  ...restCompositeProps
}: Omit<CompositeWidgetModalProps, "setup" | "onSave"> & {
  display: Display;
}) {
  const webmapId = display.config.webmapId;
  const { route: routeDisplayConfig, abort: abortDisplayConfig } = useRoute(
    "webmap.display_config",
    {
      id: webmapId,
    }
  );

  const setup = useMemo<CompositeSetup>(
    () => ({
      id: webmapId,
      operation: "update",
    }),
    [webmapId]
  );

  const onSave = useCallback(async () => {
    abortDisplayConfig();
    cache.clean();
    const newConfig = await routeDisplayConfig.get();
    display.config.update(newConfig);
  }, [abortDisplayConfig, display.config, routeDisplayConfig]);

  return (
    <CompositeWidgetModal
      setup={setup}
      onSave={onSave}
      className="ngw-webmap-editor-modal"
      {...restCompositeProps}
    />
  );
}
