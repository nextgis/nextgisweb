import { Space } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

export function renderResourceCls({
    name,
    cls,
}: {
    name: string;
    cls: string;
}) {
    return (
        <Space>
            <SvgIcon icon={`rescls-${cls}`} />
            {name}
        </Space>
    );
}
