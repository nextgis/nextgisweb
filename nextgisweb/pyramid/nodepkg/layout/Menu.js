import { useState, Fragment } from "react";
import { observer } from "mobx-react";
import { Drawer } from "@nextgisweb/gui/antd";
import { layoutStore } from "./store";
import "./Menu.less";

export const Menu = observer(({ state }) => {
    const [visible, setVisible] = useState(false);

    return (
        <Fragment>
            <div
                className="ngw-pyramid-menu-icon"
                onClick={() => setVisible(true)}
            >
                <span className="material-icons main">menu</span>
                {layoutStore.menuNotification && (
                    <span
                        className={
                            "material-icons more more-" +
                            layoutStore.menuNotification
                        }
                    >
                        circle
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
