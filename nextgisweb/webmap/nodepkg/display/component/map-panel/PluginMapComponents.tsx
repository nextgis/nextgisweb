import { observer } from "mobx-react-lite";
import { Suspense } from "react";

import type { Display } from "../../Display";

export const PluginMapComponents = observer(
  ({ display }: { display: Display }) => {
    return (
      <>
        {display.config.pluginKeys.map((key) => {
          const plugin = display.plugins[key];

          const RenderMap = plugin?.renderMap;
          if (!RenderMap) {
            return null;
          }

          return (
            <Suspense key={plugin.identity}>
              <RenderMap display={display} identity={plugin.identity} />
            </Suspense>
          );
        })}
      </>
    );
  }
);

PluginMapComponents.displayName = "PluginMapComponents";
