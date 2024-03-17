/** @testentry react */
import { useMemo } from "react";

import { List, Space } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import type { BlueprintResource } from "@nextgisweb/resource/type/api";

import { SvgIcon } from "./SvgIcon";

const SvgIconTest = () => {
    const { data: blueprint } = useRouteGet("resource.blueprint");

    const allResourceClasses = useMemo<
        (BlueprintResource & { cls: string })[]
    >(() => {
        return blueprint
            ? Object.entries(blueprint.resources).map(([cls, res]) => ({
                  ...res,
                  cls,
              }))
            : [];
    }, [blueprint]);

    return (
        <Space direction="vertical">
            <h4>All available resource icons</h4>
            <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 4, lg: 4, xl: 6, xxl: 3 }}
                dataSource={allResourceClasses}
                renderItem={({ cls, label }) => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<SvgIcon icon={`rescls-${cls}`} />}
                            title={label}
                            description={`<SvgIcon icon="rescls-${cls}" />`}
                        />
                    </List.Item>
                )}
            />
        </Space>
    );
};

export default SvgIconTest;
