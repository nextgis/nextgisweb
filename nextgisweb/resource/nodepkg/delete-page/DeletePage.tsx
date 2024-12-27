import { useMemo, useState } from "react";

import { Button, List, Space, Typography } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { DeleteIcon } from "@nextgisweb/gui/icon";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
    ResourceAffected,
    ResourceCls,
} from "@nextgisweb/resource/type/api";

import { ExclamationCircleFilled } from "@ant-design/icons";

const { Text, Paragraph, Title } = Typography;

interface DeletePageProps {
    resources: number[];
    navigateToId: number;
    isModal: boolean;
    onCancel?: () => void;
    onOk?: () => void;
}

const msgMultiple = (
    affected: ResourceAffected,
    unaffected: ResourceAffected
) => {
    if (affected.count === 0) {
        return gettext(
            "The selected resource cannot be deleted. You may not have sufficient permissions, or this resource is being referenced by other resources."
        );
    } else if (affected.count === 1 && unaffected.count === 0) {
        return gettext(
            "Please confirm the deletion of the selected resource. This action is irreversible, and the resource will be permanently deleted."
        );
    } else if (affected.count > 0 && unaffected.count === 0) {
        return gettext(
            `Please confirm the deletion of the selected resource and all its child resources. ${affected.count} resources will be permanently deleted.`
        );
    } else {
        return gettext(
            `${unaffected.count - 1} child resources cannot be deleted. Please confirm the permanent deletion of ${affected.count} child resources.`
        );
    }
};

export function DeletePage({
    resources,
    navigateToId,
    onCancel = undefined,
    onOk = undefined,
}: DeletePageProps) {
    const [deletingInProgress, setDeletingInProgress] = useState(false);

    if (!onCancel && resources.length === 1) {
        const resUrl = routeURL("resource.show", {
            id: resources[0],
        });
        onCancel = () => window.open(resUrl, "_self");
    }

    if (!onOk) {
        const parentResourceUrl = routeURL("resource.show", {
            id: navigateToId,
        });
        onOk = () => window.open(parentResourceUrl, "_self");
    }

    const { data, isLoading } = useRouteGet({
        name: "resource.items.delete",
        options: {
            query: { resources },
        },
    });

    const { data: labelData, isLoading: isLabelDataLoading } =
        useRouteGet("resource.blueprint");

    const sortedData = useMemo(() => {
        if (data && labelData)
            return Object.entries(data.affected.resources).sort(
                ([resCls1, _], [resCls2, __]) => {
                    const keys = Object.keys(labelData.resources);
                    return keys.indexOf(resCls1) - keys.indexOf(resCls2);
                }
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
            onOk();
        } catch (err) {
            errorModal(err as ApiError);
        } finally {
            setDeletingInProgress(false);
        }
    };
    if (!data || !labelData || isLoading || isLabelDataLoading) {
        return <LoadingWrapper />;
    } else {
        return (
            <Space direction="vertical" style={{ alignItems: "end" }}>
                <Space align="start">
                    <ExclamationCircleFilled
                        style={{
                            fontSize: 22,
                            color: "#faad14",
                            marginTop: "27px",
                        }}
                    />
                    <Paragraph>
                        <Title level={5}>
                            {gettext("Confirmation required")}
                        </Title>
                        <Text>
                            {msgMultiple(data.affected, data.unaffected)}
                        </Text>

                        <Title level={5}>
                            {gettext("Affected resources:")}
                        </Title>
                        <List
                            size="small"
                            dataSource={sortedData}
                            renderItem={([resCls, count], _) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={
                                            <SvgIcon
                                                fontSize={22}
                                                icon={"rescls-" + resCls}
                                            />
                                        }
                                        title={
                                            labelData?.resources[
                                                resCls as ResourceCls
                                            ].label
                                        }
                                    />
                                    <Text>
                                        {`${count} ${gettext("resources")}`}
                                    </Text>
                                </List.Item>
                            )}
                        />
                    </Paragraph>
                </Space>

                <Space>
                    <Button type="default" onClick={onCancel}>
                        {gettext("Cancel")}
                    </Button>
                    <Button
                        disabled={data.affected.count === 0}
                        danger
                        type="primary"
                        icon={<DeleteIcon />}
                        loading={deletingInProgress}
                        onClick={onDeleteClick}
                    >
                        {data.affected.count
                            ? gettext(`Delete ${data.affected.count} resources`)
                            : gettext("Delete")}
                    </Button>
                </Space>
            </Space>
        );
    }
}
