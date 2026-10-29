import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Divider, Drawer, Flex } from "@nextgisweb/gui/antd";
import { useConfig } from "@nextgisweb/gui/antd/config-provider";

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
  ({ visible, setVisible, sidebar, ...headerProps }) => {
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

    const { direction } = useConfig();
    const { menuItems: storeMenuItems } = layoutStore;

    return (
      <Drawer
        className="ngw-pyramid-menu-drawer"
        placement={direction === "rtl" ? "left" : "right"}
        open={visible}
        onClose={() => setVisible(false)}
      >
        {sidebar && (
          <>
            <Flex vertical gap={24} style={{ padding: 24 }}>
              {sidebar}
            </Flex>
            <Divider size="small" />
          </>
        )}
        <div className="ngw-pyramid-menu-drawer-main">
          {[...storeMenuItems, ...pluginMenuItems].map((item, i) => {
            return <MenuItem key={i} item={item} />;
          })}
        </div>
      </Drawer>
    );
  }
);

MenuDrawer.displayName = "MenuDrawer";

export default MenuDrawer;
