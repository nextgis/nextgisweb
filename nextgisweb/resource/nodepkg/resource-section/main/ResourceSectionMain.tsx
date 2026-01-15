import { Fragment, useEffect, useState } from "react";

import { assert } from "@nextgisweb/jsrealm/error";
import { PageTitle } from "@nextgisweb/pyramid/layout";
import { useResourceAttr } from "@nextgisweb/resource/hook/useResourceAttr";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import type { ResourceSection, ResourceSectionProps } from "../type";

import { CreateResourceButton } from "./CreateResourceButton";

import "./ResourceSectionMain.less";

const ResourceSectionMain: ResourceSection<ResourceSectionProps> = ({
    resourceId,
}) => {
    const [creatable, setCreatable] = useState<ResourceCls[]>();
    const [summary, setSummary] = useState<[string, string][]>();
    const { fetchResourceItems: fetchResourceAttr } = useResourceAttr();

    useEffect(() => {
        (async () => {
            const items = await fetchResourceAttr({
                resources: [resourceId],
                attributes: [
                    ["resource.children_creatable"],
                    ["resource.has_permission", "data.read"],
                    ["resource.has_permission", "data.read"],
                    ["resource.summary"],
                ],
            });
            const item = items[0];
            assert(item.id === resourceId);
            const dataCreatable = item.get("resource.children_creatable");
            const dataSummary = item.get("resource.summary");
            setCreatable(dataCreatable);
            setSummary(dataSummary);
        })();
    }, [fetchResourceAttr, resourceId]);

    return (
        <>
            <PageTitle pullRight>
                {creatable && creatable.length > 0 && (
                    <CreateResourceButton
                        resourceId={resourceId}
                        creatable={creatable}
                    />
                )}
            </PageTitle>
            {summary && summary.length > 0 && (
                <dl className="ngw-resource-main-section-summary">
                    {summary.map(([k, v], idx) => (
                        <Fragment key={idx}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                        </Fragment>
                    ))}
                </dl>
            )}
        </>
    );
};

ResourceSectionMain.displayName = "ResourceSectionMain";

export { ResourceSectionMain };
