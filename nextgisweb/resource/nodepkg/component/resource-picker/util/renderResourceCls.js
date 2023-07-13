import { Space } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";

export function renderResourceCls({ name, cls }) {
    return (
        <Space>
            <SvgIcon icon={`rescls-${cls}`} />
            {name}
        </Space>
    );
}
