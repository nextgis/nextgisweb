import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Drawer } from "@nextgisweb/gui/antd";

import { MenuItem } from "./MenuItem";
import type { HeaderProps } from "./header/Header";
import { registry } from "./header/registry";
import type { HeaderComponent } from "./header/type";
import { layoutStore } from "./store";

import CircleIcon from "@nextgisweb/icon/material/circle/fill";
import MenuIcon from "@nextgisweb/icon/material/menu";

import "./Menu.less";

const Menu = observer<HeaderProps>((props) => {
    const [visible, setVisible] = useState(false);

    const [pluginMenuItems] = useState(() => {
        const plugins = Array.from(registry.query({ menuItem: true }));
        const pluginMenuItems: HeaderComponent[] = [];
        for (const { component, isEnabled } of plugins) {
            if (isEnabled && !isEnabled(props)) {
                continue;
            }
            pluginMenuItems.push(component);
        }
        return pluginMenuItems;
    });

    const { menuItems: storeMenuItems } = layoutStore;

    return (
        <>
            <div
                className="ngw-pyramid-menu-icon"
                onClick={() => setVisible(true)}
            >
                <MenuIcon />
                {layoutStore.notification && (
                    <span className={"more more-" + layoutStore.notification}>
                        <CircleIcon />
                    </span>
                )}
            </div>
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
        </>
    );
});

Menu.displayName = "Menu";
export default Menu;
