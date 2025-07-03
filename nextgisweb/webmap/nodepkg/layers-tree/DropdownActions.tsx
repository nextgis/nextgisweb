import { Divider, Dropdown } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import type { RootItemConfig } from "@nextgisweb/webmap/type/api";

import type { PluginBase } from "../plugin/PluginBase";
import type { TreeItemConfig } from "../type/TreeItems";

import MoreVertIcon from "@nextgisweb/icon/material/more_vert/outline";
import "./DropdownActions.less";

interface DropdownActionsProps {
    nodeData: TreeItemConfig | RootItemConfig;
    getWebmapPlugins: () => Record<string, PluginBase>;
    moreClickId?: number;
    setMoreClickId: (id: number | undefined) => void;
    update: boolean;
    setUpdate: (update: boolean) => void;
}

export function DropdownActions({
    update,
    nodeData,
    moreClickId,
    getWebmapPlugins,
    setMoreClickId,
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
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMoreClickId(id);
                }}
            >
                <MoreVertIcon />
            </span>
        );
    }

    const menuItems: MenuProps["items"] = [];
    const customMenuItems: React.ReactElement[] = [];
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
                    if (plugin) {
                        if (onClick) {
                            onClick();
                        } else if (plugin.run) {
                            const result = await plugin.run(nodeData);
                            if (result !== undefined) {
                                setUpdate(!update);
                            }
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
            menu={{
                items: menuItems,
                onClick: ({ domEvent }) => {
                    domEvent.stopPropagation();
                },
            }}
            onOpenChange={() => {
                setMoreClickId(undefined);
            }}
            trigger={["click"]}
            destroyOnHidden
            open
            placement="bottomRight"
            popupRender={(menu) => (
                <div
                    className="dropdown-content"
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                >
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
            <span
                className="more"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                <MoreVertIcon />
            </span>
        </Dropdown>
    );
}
