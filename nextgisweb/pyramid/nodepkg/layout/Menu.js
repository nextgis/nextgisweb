import { useState } from "react";
import { observer } from "mobx-react";
import { Drawer } from "@nextgisweb/gui/antd";
import { layoutStore } from "./store";
import CircleIcon from "@material-icons/svg/circle";
import MenuIcon from "@material-icons/svg/menu";
import "./Menu.less";

const MenuItem = observer(({ title, ...rest }) => <a {...rest}>{title}</a>);

export const Menu = observer(() => {
    const [visible, setVisible] = useState(false);

    return (
        <>
            <div
                className="ngw-pyramid-menu-icon"
                onClick={() => setVisible(true)}
            >
                <MenuIcon />
                {layoutStore.menuNotification && (
                    <span
                        className={"more more-" + layoutStore.menuNotification}
                    >
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
