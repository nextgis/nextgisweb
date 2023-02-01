import {Dropdown} from "@nextgisweb/gui/antd";
import DescriptionIcon from "@material-icons/svg/description/outline";
import ListAltIcon from "@material-icons/svg/list_alt/baseline";
import AspectRationIcon from "@material-icons/svg/aspect_ratio/baseline";
import MoreVertIcon from "@material-icons/svg/more_vert/outline";
import EditIcon from "@material-icons/svg/edit/outline";

import i18n from "@nextgisweb/pyramid/i18n!webmap";

import PropTypes from "prop-types";

const PLUGINS = {
    LayerInfo: "ngw-webmap/plugin/LayerInfo",
    LayerEditor: "ngw-webmap/plugin/LayerEditor",
    ZoomToLayer: "ngw-webmap/plugin/ZoomToLayer",
    FeatureLayer: "ngw-webmap/plugin/FeatureLayer"
};

const makeMenuItemByPlugin = (keyPlugin, pluginInfo) => {
    const {enabled} = pluginInfo;
    if (!enabled) {
        return undefined;
    }

    if (keyPlugin === PLUGINS.LayerInfo) {
        return {
            key: keyPlugin,
            label: <>
                <span><DescriptionIcon/></span>
                <span>{i18n.gettext("Description")}</span>
            </>
        };
    }

    if (keyPlugin === PLUGINS.LayerEditor) {
        const {active} = pluginInfo;
        const title = active ?
            i18n.gettext("Stop edit") :
            i18n.gettext("Edit");
        return {
            key: keyPlugin,
            label: <>
                <span><EditIcon/></span>
                <span>{title}</span>
            </>
        };
    }

    if (keyPlugin === PLUGINS.ZoomToLayer) {
        return {
            key: keyPlugin,
            label: <>
                <span><AspectRationIcon/></span>
                <span>{i18n.gettext("Zoom to layer")}</span>
            </>
        };
    }

    if (keyPlugin === PLUGINS.FeatureLayer) {
        return {
            key: keyPlugin,
            label: <>
                <span><ListAltIcon/></span>
                <span>{i18n.gettext("Feature table")}</span>
            </>
        };
    }
};

export function DropdownActions({
                                    nodeData, getWebmapPlugins,
                                    moreClickId, setMoreClickId,
                                    update, setUpdate
                                }
) {
    const {id, type} = nodeData;
    if (type === "root" || type === "group") {
        return <></>;
    }
    if (moreClickId === undefined || moreClickId !== id) {
        return <MoreVertIcon onClick={() => {
            setMoreClickId(id);
        }}/>;
    }

    const menuItems = [];
    Object.entries(getWebmapPlugins()).forEach(([keyPlugin, plugin]) => {
        if (!plugin || !plugin.getPluginState) {
            return;
        }
        const pluginInfo = plugin.getPluginState(nodeData);
        const menuItem = makeMenuItemByPlugin(keyPlugin, pluginInfo);
        if (!menuItem) {
            return;
        }
        menuItems.push(menuItem);
    });

    const menuProps = {
        items: menuItems,
        onClick: (clickRcMenuItem) => {
            const {key} = clickRcMenuItem;
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
        }
    };

    const onOpenChange = () => {
        setMoreClickId(undefined);
    };

    return <Dropdown menu={menuProps}
                     overlayClassName="tree-item-menu"
                     onOpenChange={onOpenChange}
                     trigger={["click"]}
                     destroyPopupOnHide
                     open
                     placement="bottomRight">
        <MoreVertIcon/>
    </Dropdown>;
}

DropdownActions.propTypes = {
    nodeData: PropTypes.object,
    getWebmapPlugins: PropTypes.func,
    moreClickId: PropTypes.number,
    setMoreClickId: PropTypes.func,
    update: PropTypes.bool,
    setUpdate: PropTypes.func
};
