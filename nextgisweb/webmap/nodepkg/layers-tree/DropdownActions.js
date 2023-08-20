import { Divider, Dropdown } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert/outline";

import "./DropdownActions.less";

export function DropdownActions({
    nodeData,
    getWebmapPlugins,
    moreClickId,
    setMoreClickId,
    update,
    setUpdate,
}) {
    const { id, type } = nodeData;
    if (type === "root" || type === "group") {
        return <></>;
    }
    if (moreClickId === undefined || moreClickId !== id) {
        return (
            <span
                className="more"
                onClick={() => {
                    setMoreClickId(id);
                }}
            >
                <MoreVertIcon />
            </span>
        );
    }

    const menuItems = [];
    const customMenuItems = [];
    const plugins = getWebmapPlugins();
    for (const keyPlugin in plugins) {
        const plugin = plugins[keyPlugin];
        if (!plugin || !plugin.getPluginState) {
            continue;
        }
        const pluginInfo = plugin.getPluginState(nodeData);
        if (pluginInfo.enabled) {
            if (plugin.getMenuItem) {
                const { icon, title, onClick } = plugin.getMenuItem(nodeData);
                const onClick_ = async () => {
                    const run = onClick || plugin.run;
                    if (plugin && run) {
                        const result = await run(nodeData);
                        if (result !== undefined) {
                            setUpdate(!update);
                        }
                    }
                    setMoreClickId(undefined);
                };

                menuItems.push({
                    key: keyPlugin,
                    onClick: onClick_,
                    icon:
                        typeof icon === "string" ? (
                            <SvgIcon
                                className="icon"
                                icon={icon}
                                fill="currentColor"
                            />
                        ) : (
                            icon
                        ),
                    label: title,
                });
            } else if (plugin.render) {
                customMenuItems.push(plugin.render.bind(plugin, pluginInfo));
            }
        }
    }

    const menuProps = {
        items: menuItems,
    };

    const onOpenChange = () => {
        setMoreClickId(undefined);
    };

    return (
        <Dropdown
            menu={menuProps}
            onOpenChange={onOpenChange}
            trigger={["click"]}
            destroyPopupOnHide
            open
            placement="bottomRight"
            dropdownRender={(menu) => (
                <div className="dropdown-content">
                    {menu}
                    {customMenuItems.length ? (
                        <>
                            <Divider style={{ margin: 0 }} />
                            <div className="ant-dropdown-menu">
                                {customMenuItems.map((Item, i) => (
                                    <div key={i}>
                                        <Item />
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        ""
                    )}
                </div>
            )}
        >
            <span className="more">
                <MoreVertIcon />
            </span>
        </Dropdown>
    );
}
