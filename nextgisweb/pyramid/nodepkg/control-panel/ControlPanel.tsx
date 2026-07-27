import { useEffect, useState } from "react";

import { isAbortError } from "@nextgisweb/gui/error";

import { useAbortController } from "../hook";
import { Dynmenu } from "../layout";
import type { DynMenuItem } from "../layout/dynmenu/Dynmenu";

import { resolveControlPanelDynMenuItems } from "./resolveControlPanelDynMenuItems";

export function ControlPanel() {
  const { makeSignal } = useAbortController();
  const [items, setItems] = useState<DynMenuItem[]>([]);

  useEffect(() => {
    let canceled = false;

    resolveControlPanelDynMenuItems(makeSignal())
      .then((items) => {
        if (!canceled) {
          setItems(items);
        }
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          throw err;
        }
      });

    return () => {
      canceled = true;
    };
  }, [makeSignal]);

  return <Dynmenu items={items} />;
}
