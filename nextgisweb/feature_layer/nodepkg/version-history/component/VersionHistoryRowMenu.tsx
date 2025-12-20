import dayjs from "dayjs";
import { useCallback } from "react";

import { Button, Dropdown, message } from "@nextgisweb/gui/antd";
import type { MenuProps } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { useConfirm } from "@nextgisweb/gui/hook/useConfirm";
import { route } from "@nextgisweb/pyramid/api";
import {
    useAbortController,
    useRoute,
    useRouteGet,
} from "@nextgisweb/pyramid/hook";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

import type { VersionItem } from "../hook/useColumns";

import { EllipsisOutlined } from "@ant-design/icons";

export function VersionHistoryRowMenu({
    item,
    epoch,
    resourceId: id,
    bumpReloadKey,
}: {
    item: VersionItem;
    epoch: number;
    resourceId: number;
    bumpReloadKey: () => void;
}) {
    const [messageApi, messageContextHolder] = message.useMessage();
    const { confirm, contextHolder: confirmContextHolder } = useConfirm();
    const { makeSignal } = useAbortController();
    const { route: txnCollectionRoute } = useRoute(
        "feature_layer.transaction.collection",
        { id }
    );

    const { data } = useRouteGet({
        name: "auth.user.item",
        params: {
            id: item.user?.id ?? 0,
        },
        enabled: typeof item.user?.id === "number",
        options: { cache: true },
    });
    const author = data?.display_name ?? `#${item.user?.id}`;

    const revertToVersion = useCallback(async () => {
        try {
            const created = await txnCollectionRoute.post({
                json: { epoch },
            });
            const tid = created.id;
            const txnItemRoute = route("feature_layer.transaction.item", {
                id,
                tid,
            });
            await txnItemRoute.put({
                json: [
                    [
                        1,
                        {
                            "action": "revert",
                            "tid": item.type === "group" ? item.id[1] : item.id,
                        },
                    ],
                ],
                signal: makeSignal(),
            });

            const commitResp = await txnItemRoute.post({
                body: "",
                signal: makeSignal(),
            });

            if (commitResp && commitResp.status === "committed") {
                messageApi.success(gettext("Reverted"));
                bumpReloadKey();
            } else {
                errorModal("Transaction was not committed");
            }
        } catch (err) {
            errorModal(err);
        }
    }, [
        id,
        epoch,
        item.id,
        item.type,
        messageApi,
        txnCollectionRoute,
        makeSignal,
        bumpReloadKey,
    ]);

    const timestamp = dayjs
        .utc(item.type === "group" ? item.tstamp[1] : item.tstamp)
        .local()
        .format("DD.MM.YYYY HH:mm:ss");

    const onRevertClick = () => {
        confirm({
            title: gettext("Confirmation required"),
            // prettier-ignore
            content: gettextf("Please confirm reversion of the layer to version {timestamp} by {author}. This will revert all feature changes made after {timestamp}, but the changes will be kept in the history.")
            ({ author, timestamp }),

            okText: gettext("Revert"),
            onOk: revertToVersion,
        });
    };

    const items: MenuProps["items"] = [
        {
            key: "revert",
            label: gettext("Revert to this version"),
            onClick: onRevertClick,
        },
    ];

    return (
        <>
            {confirmContextHolder}
            {messageContextHolder}
            <Dropdown menu={{ items }} trigger={["click"]}>
                <Button type="text" icon={<EllipsisOutlined />} size="small" />
            </Dropdown>
        </>
    );
}
