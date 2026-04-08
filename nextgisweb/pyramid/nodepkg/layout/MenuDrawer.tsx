import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Drawer } from "@nextgisweb/gui/antd";

import { MenuItem } from "./MenuItem";
import type { HeaderProps } from "./header/Header";
import { registry } from "./header/registry";
import type { HeaderComponent } from "./header/type";
import { layoutStore } from "./store";

import "./MenuDrawer.less";

interface MenuDrawerProps extends HeaderProps {
  visible: boolean;
  setVisible: (val: boolean) => void;
}

const MenuDrawer = observer<MenuDrawerProps>(
  ({ visible, setVisible, ...headerProps }) => {
    const [pluginMenuItems] = useState(() => {
      const plugins = Array.from(registry.query({ menuItem: true }));
      const pluginMenuItems: HeaderComponent[] = [];
      for (const { component, isEnabled } of plugins) {
        if (isEnabled && !isEnabled(headerProps)) {
          continue;
        }
        pluginMenuItems.push(component);
      }
      return pluginMenuItems;
    });

    const { menuItems: storeMenuItems } = layoutStore;

    return (
      <Drawer
        placement="right"
        open={visible}
        onClose={() => setVisible(false)}
        className="ngw-pyramid-menu-drawer"
      >
        {[...storeMenuItems, ...pluginMenuItems].map((item, i) => {
          return <MenuItem key={i} item={item} />;
        })}
      </Drawer>
    );
  }
);

MenuDrawer.displayName = "MenuDrawer";

export default MenuDrawer;
