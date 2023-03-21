import PropTypes from "prop-types";

import { useMemo } from "react";

import { Dropdown, Divider, Space } from "@nextgisweb/gui/antd";
import DescriptionIcon from "@material-icons/svg/description/outline";
import ListAltIcon from "@material-icons/svg/list_alt/baseline";
import AspectRationIcon from "@material-icons/svg/aspect_ratio/baseline";
import MoreVertIcon from "@material-icons/svg/more_vert/outline";
import EditIcon from "@material-icons/svg/edit/outline";

import i18n from "@nextgisweb/pyramid/i18n!webmap";

import "./DropdownActions.less";

const PLUGINS = {
    LayerInfo: "ngw-webmap/plugin/LayerInfo",
    LayerEditor: "ngw-webmap/plugin/LayerEditor",
    ZoomToLayer: "ngw-webmap/plugin/ZoomToLayer",
    FeatureLayer: "ngw-webmap/plugin/FeatureLayer",
};

const makeMenuItemByPlugin = (keyPlugin, pluginInfo) => {
    const { enabled } = pluginInfo;
    if (!enabled) {
        return undefined;
    }

    if (keyPlugin === PLUGINS.LayerInfo) {
        return {
            key: keyPlugin,
            label: (
                <>
                    <span>
                        <DescriptionIcon />
                    </span>
                    <span>{i18n.gettext("Description")}</span>
                </>
            ),
        };
    }

    if (keyPlugin === PLUGINS.LayerEditor) {
        const { active } = pluginInfo;
        const title = active
            ? i18n.gettext("Stop editing")
            : i18n.gettext("Edit");
        return {
            key: keyPlugin,
            label: (
                <>
                    <span>
                        <EditIcon />
                    </span>
                    <span>{title}</span>
                </>
            ),
        };
    }

    if (keyPlugin === PLUGINS.ZoomToLayer) {
        return {
            key: keyPlugin,
            label: (
                <>
                    <span>
                        <AspectRationIcon />
                    </span>
                    <span>{i18n.gettext("Zoom to layer")}</span>
                </>
            ),
        };
    }

    if (keyPlugin === PLUGINS.FeatureLayer) {
        return {
            key: keyPlugin,
            label: (
                <>
                    <span>
                        <ListAltIcon />
                    </span>
                    <span>{i18n.gettext("Feature table")}</span>
                </>
            ),
        };
    }
};

export function DropdownActions({
    nodeData,
    getWebmapPlugins,
    moreClickId,
    setMoreClickId,
    update,
    setUpdate,
}) {
    const [menuItems, customMenuItems] = useMemo(() => {
        const menuItems_ = [];
        const customMenuItems_ = [];
        Object.entries(getWebmapPlugins()).forEach(([keyPlugin, plugin]) => {
            if (!plugin || !plugin.getPluginState) {
                return;
            }
            const pluginInfo = plugin.getPluginState(nodeData);
            if (plugin.run) {
                const menuItem = makeMenuItemByPlugin(keyPlugin, pluginInfo);
                if (!menuItem) {
                    return;
                }
                menuItems_.push(menuItem);
            } else if (plugin.render) {
                customMenuItems_.push(plugin.render.bind(plugin, pluginInfo));
            }
        });
        return [menuItems_, customMenuItems_];
    }, [getWebmapPlugins, nodeData]);

    const menuProps = useMemo(() => {
        return {
            items: menuItems,
            onClick: (clickRcMenuItem) => {
                const { key } = clickRcMenuItem;
                const webmapPlugins = getWebmapPlugins();
                if (webmapPlugins[key]) {
                    const plugin = webmapPlugins[key];
                    if (plugin && plugin.run) {
                        const resultRun = plugin.run(nodeData);
                        if (resultRun) {
                            resultRun.then(() => {
                                setUpdate(!update);
                            });
                        }
                    }
                }
                setMoreClickId(undefined);
            },
        };
    }, [
        getWebmapPlugins,
        setMoreClickId,
        menuItems,
        setUpdate,
        nodeData,
        update,
    ]);

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
                    {customMenuItems.length && (
                        <>
                            <Divider style={{ margin: 0 }} />
                            <Space
                                style={{ padding: '5px 12px', width: "100%" }}
                                direction="vertical"
                            >
                                {customMenuItems.map((Item, i) => (
                                    <Item key={i}></Item>
                                ))}
                            </Space>
                        </>
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
