import { observer } from "mobx-react-lite";
import { Suspense, lazy, useState } from "react";

import type { HeaderProps } from "./header/Header";
import { layoutStore } from "./store";

import CircleIcon from "@nextgisweb/icon/material/circle/fill";
import MenuIcon from "@nextgisweb/icon/material/menu";

import "./Menu.less";

const DrawerLazy = lazy(() => import("./MenuDrawer"));

export const Menu = observer<HeaderProps>((props) => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <div className="ngw-pyramid-menu-icon" onClick={() => setVisible(true)}>
        <MenuIcon />
        {layoutStore.notification && (
          <span className={"more more-" + layoutStore.notification}>
            <CircleIcon />
          </span>
        )}
      </div>
      <Suspense>
        <DrawerLazy visible={visible} setVisible={setVisible} {...props} />
      </Suspense>
    </>
  );
});

Menu.displayName = "Menu";
