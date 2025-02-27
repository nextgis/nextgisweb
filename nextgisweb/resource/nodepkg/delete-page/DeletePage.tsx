import classNames from "classnames";
import { sortBy } from "lodash-es";
import { useMemo, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { DeleteIcon } from "@nextgisweb/gui/icon";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

import { ResourceIcon } from "../icon";

import type { DeletePageProps } from "./type";
import { msgDeleteButton, msgMultiple, msgResourcesCount } from "./util";

import "./DeletePage.less";

export function DeletePage({
    resources,
    navigateToId,
    isModal = false,
    onCancel,
    onOk,
}: DeletePageProps) {
    const [deletingInProgress, setDeletingInProgress] = useState(false);

    if (!isModal && navigateToId !== undefined) {
        const parentResourceUrl = routeURL("resource.show", {
            id: navigateToId,
        });
        onOk = () => window.open(parentResourceUrl, "_self");
    }

    const { data, isLoading } = useRouteGet({
        name: "resource.items.delete",
        options: { query: { resources } },
    });

    const { data: labelData, isLoading: isLabelDataLoading } = useRouteGet(
        "resource.blueprint",
        undefined,
        { cache: true }
    );

    const sortedData = useMemo(() => {
        if (data && labelData)
            return sortBy(
                Object.entries(data.affected.resources).map(([cls, count]) => {
                    const pb = labelData?.resources[cls as ResourceCls];
                    return { cls, count, label: pb.label, order: pb.order };
                }),
                ["order", "label"]
            );
    }, [data, labelData]);

    const onDeleteClick = async () => {
        setDeletingInProgress(true);
        try {
            await route("resource.items.delete").post({
                query: {
                    resources,
                    partial: true,
                },
                body: "",
            });
            onOk?.();
        } catch (err) {
            errorModal(err as ApiError);
        } finally {
            setDeletingInProgress(false);
        }
    };

    if (!data || !labelData || isLoading || isLabelDataLoading) {
        return <LoadingWrapper />;
    }

    return (
        <div className="ngw-resource-delete-page">
            {msgMultiple(data.affected, data.unaffected)}

            {sortedData && sortedData.length > 0 && (
                <div className={classNames("table", isModal && "modal")}>
                    <div>
                        {sortedData.map(({ cls, count, label }) => (
                            <div key={cls}>
                                <ResourceIcon
                                    identity={cls as ResourceCls}
                                    style={{
                                        width: "16px",
                                        height: "16px",
                                    }}
                                />
                                <div>{label}</div>
                                <div className="count">{count}</div>
                                <div>{msgResourcesCount(count)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="buttons">
                <Button
                    disabled={data.affected.count === 0}
                    danger
                    type="primary"
                    icon={<DeleteIcon />}
                    loading={deletingInProgress}
                    onClick={onDeleteClick}
                >
                    {msgDeleteButton(data.affected.count)}
                </Button>

                {isModal && (
                    <Button
                        className="cancel"
                        type="default"
                        onClick={onCancel}
                    >
                        {gettext("Cancel")}
                    </Button>
                )}
            </div>
        </div>
    );
}
