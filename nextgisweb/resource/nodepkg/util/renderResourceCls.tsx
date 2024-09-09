import { Space } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

export function renderResourceCls({
    name,
    cls,
}: {
    name: React.ReactNode;
    cls: ResourceCls;
}) {
    return (
        <Space>
            <SvgIcon icon={`rescls-${cls}`} />
            {name}
        </Space>
    );
}
