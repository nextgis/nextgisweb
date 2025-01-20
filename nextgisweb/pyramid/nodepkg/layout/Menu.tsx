import classNames from "classnames";
import { observer } from "mobx-react-lite";
import { useState } from "react";

import { Drawer } from "@nextgisweb/gui/antd";

import { layoutStore } from "./store";
import type { MenuItem as MenuItemProps } from "./store";

import CircleIcon from "@nextgisweb/icon/material/circle/fill";
import MenuIcon from "@nextgisweb/icon/material/menu";

import "./Menu.less";

const MenuItem = observer(
    ({ title, className, notification, ...rest }: MenuItemProps) => (
        <a
            className={classNames(
                className,
                notification && `notification-${notification}`
            )}
            {...rest}
        >
            {title}
        </a>
    )
);

MenuItem.displayName = "MenuItem";

export const Menu = observer(() => {
    const [visible, setVisible] = useState(false);

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
                {layoutStore.menuItems.map((item, i) => (
                    <MenuItem key={i} {...item} />
                ))}
            </Drawer>
        </>
    );
});

Menu.displayName = "Menu";
