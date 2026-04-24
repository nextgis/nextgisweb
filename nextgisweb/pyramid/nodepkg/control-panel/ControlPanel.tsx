import { useEffect, useState } from "react";

import { useAbortController } from "../hook";
import { Dynmenu } from "../layout";
import type { CustomDynMenuItem } from "../layout/dynmenu/Dynmenu";

import { resolveControlPanelDynMenuItems } from "./resolveControlPanelDynMenuItems";

export function ControlPanel() {
  const { makeSignal } = useAbortController();
  const [items, setItems] = useState<CustomDynMenuItem[]>([]);

  useEffect(() => {
    let canceled = false;

    resolveControlPanelDynMenuItems(makeSignal()).then((items) => {
      if (!canceled) {
        setItems(items);
      }
    });

    return () => {
      canceled = true;
    };
  }, [makeSignal]);

  return <Dynmenu items={items} />;
}
