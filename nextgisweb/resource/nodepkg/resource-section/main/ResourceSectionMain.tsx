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
    const { fetchResourceAttr } = useResourceAttr();

    useEffect(() => {
        (async () => {
            const items = await fetchResourceAttr({
                resources: [resourceId],
                attributes: [
                    ["resource.children_creatable"],
                    ["resource.summary"],
                ],
            });
            assert(items[0][0] === resourceId);
            const [dataCreatable, dataSummary] = items[0][1];
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
