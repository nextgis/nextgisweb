import { observer } from "mobx-react-lite";
import { Suspense } from "react";

import type { Display } from "../../Display";

export const PanelMapComponents = observer(
  ({ display }: { display: Display }) => {
    return (
      <>
        {display.panelManager.plugins.map((plugin) => {
          const RenderMap = plugin.renderMap;

          if (!RenderMap) {
            return null;
          }

          return (
            <Suspense key={plugin.name}>
              <RenderMap display={display} />
            </Suspense>
          );
        })}
      </>
    );
  }
);

PanelMapComponents.displayName = "PanelMapComponents";
