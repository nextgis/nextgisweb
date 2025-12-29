import { Button, Dropdown } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";

import type { VersionItem } from "../hook/useColumns";

import { useCopyMenuItem } from "./menu-items/copy-menu-item";
import { useRevertMenuItem } from "./menu-items/useRevertMenuItem";

import { EllipsisOutlined } from "@ant-design/icons";

export type VersionHistoryMenuCtx = {
    item: VersionItem;
    epoch: number;
    versionId: number | [number, number];
    resourceId: number;
    bumpReloadKey: () => void;
};

export interface VersionHistoryMenuItem {
    item: NonNullable<MenuProps["items"]>[number];
    holder: React.ReactNode;
}

export function VersionHistoryRowMenu(ctx: VersionHistoryMenuCtx) {
    const revert = useRevertMenuItem(ctx);
    const copy = useCopyMenuItem(ctx);
    const items: MenuProps["items"] = [revert.item, copy.item];

    return (
        <>
            {revert.holder}
            {copy.holder}
            <Dropdown menu={{ items }} trigger={["click"]}>
                <Button type="text" icon={<EllipsisOutlined />} size="small" />
            </Dropdown>
        </>
    );
}
