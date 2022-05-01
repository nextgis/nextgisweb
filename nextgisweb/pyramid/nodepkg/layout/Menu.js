import { useState, Fragment } from "react";
import { observer } from "mobx-react";
import { Drawer } from "@nextgisweb/gui/antd";
import { layoutStore } from "./store";
import CircleIcon from "@material-icons/svg/circle";
import MenuIcon from "@material-icons/svg/menu";
import "./Menu.less";

export const Menu = observer(({ state }) => {
    const [visible, setVisible] = useState(false);

    return (
        <Fragment>
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
                visible={visible}
                onClose={() => setVisible(false)}
                className="ngw-pyramid-menu-drawer"
            >
                {layoutStore.menuItems.map((itm) => {
                    const { title, ...rest } = itm;
                    return <a {...rest}>{title}</a>;
                })}
            </Drawer>
        </Fragment>
    );
});
