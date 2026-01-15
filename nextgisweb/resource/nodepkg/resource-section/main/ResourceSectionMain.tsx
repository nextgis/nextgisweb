import { Fragment, useEffect, useState } from "react";

import { assert } from "@nextgisweb/jsrealm/error";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { PageTitle } from "@nextgisweb/pyramid/layout";
import { resourceAttr } from "@nextgisweb/resource/api/resource-attr";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import type { ResourceSection, ResourceSectionProps } from "../type";

import { CreateResourceButton } from "./CreateResourceButton";

import "./ResourceSectionMain.less";

const ResourceSectionMain: ResourceSection<ResourceSectionProps> = ({
    resourceId,
}) => {
    const [creatable, setCreatable] = useState<ResourceCls[]>();
    const [summary, setSummary] = useState<[string, string][]>();
    const { route } = useRoute("resource.attr");

    useEffect(() => {
        (async () => {
            const items = await resourceAttr({
                resources: [resourceId],
                attributes: [
                    ["resource.children_creatable"],
                    ["resource.summary"],
                ],
                route,
            });
            assert(items[0][0] === resourceId);
            const [dataCreatable, dataSummary] = items[0][1];
            setCreatable(dataCreatable);
            setSummary(dataSummary);
        })();
    }, [resourceId, route]);

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
