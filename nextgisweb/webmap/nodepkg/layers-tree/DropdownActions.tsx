import { Divider, Dropdown } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

import type { WebmapPlugin } from "../type";
import type { TreeItem } from "../type/TreeItems";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert/outline";
import "./DropdownActions.less";

interface DropdownActionsProps {
    nodeData: TreeItem;
    getWebmapPlugins: () => Record<string, WebmapPlugin>;
    moreClickId?: number;
    setMoreClickId: (id: number | undefined) => void;
    update: boolean;
    setUpdate: (update: boolean) => void;
}

export function DropdownActions({
    nodeData,
    getWebmapPlugins,
    moreClickId,
    setMoreClickId,
    update,
    setUpdate,
}: DropdownActionsProps) {
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

    const menuItems: MenuProps["items"] = [];
    const customMenuItems: JSX.Element[] = [];
    const plugins = getWebmapPlugins();
    for (const keyPlugin in plugins) {
        const plugin = plugins[keyPlugin];
        if (!plugin || !plugin.getPluginState) {
            continue;
        }
        const { render } = plugin;
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
            } else if (render) {
                const RenderedPlugin = () => render.call(plugin, pluginInfo);
                customMenuItems.push(<RenderedPlugin key={keyPlugin} />);
            }
        }
    }

    return (
        <Dropdown
            menu={{ items: menuItems }}
            onOpenChange={() => {
                setMoreClickId(undefined);
            }}
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
                            <div className="ant-dropdown-menu">
                                {customMenuItems}
                            </div>
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
