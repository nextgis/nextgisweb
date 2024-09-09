import { Fragment } from "react";

import { PageTitle } from "@nextgisweb/pyramid/layout";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import { CreateResourceButton } from "./CreateResourceButton";

import "./MainSection.less";

interface MainSectionProps {
    resourceId: number;
    summary: [string, string][];
    creatable?: ResourceCls[];
}

export function MainSection({
    resourceId,
    summary,
    creatable,
}: MainSectionProps) {
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
            {summary.length > 0 && (
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
}
