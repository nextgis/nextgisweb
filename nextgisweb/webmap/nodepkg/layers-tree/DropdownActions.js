import PropTypes from "prop-types";

import { Dropdown, Divider, Space } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

import MoreVertIcon from "@material-icons/svg/more_vert/outline";

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
                    label: (
                        <>
                            <span>
                                {typeof icon === "string" ? (
                                    <SvgIcon icon={icon} fill="currentColor" />
                                ) : (
                                    icon
                                )}
                            </span>
                            <span>{title}</span>
                        </>
                    ),
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
            overlayClassName="tree-item-menu"
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
                            <Space
                                style={{ padding: "5px 12px", width: "100%" }}
                                direction="vertical"
                            >
                                {customMenuItems.map((Item, i) => (
                                    <Item key={i}></Item>
                                ))}
                            </Space>
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

DropdownActions.propTypes = {
    nodeData: PropTypes.object,
    getWebmapPlugins: PropTypes.func,
    moreClickId: PropTypes.number,
    setMoreClickId: PropTypes.func,
    update: PropTypes.bool,
    setUpdate: PropTypes.func,
};
