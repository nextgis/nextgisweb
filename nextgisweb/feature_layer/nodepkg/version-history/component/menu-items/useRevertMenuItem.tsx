import dayjs from "dayjs";
import { useCallback, useMemo } from "react";

import { message } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { useConfirm } from "@nextgisweb/gui/hook/useConfirm";
import { route } from "@nextgisweb/pyramid/api";
import {
    useAbortController,
    useRoute,
    useRouteGet,
} from "@nextgisweb/pyramid/hook";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

import type {
    VersionHistoryMenuCtx,
    VersionHistoryMenuItem,
} from "../VersionHistoryRowMenu";

export function useRevertMenuItem(
    ctx: VersionHistoryMenuCtx
): VersionHistoryMenuItem {
    const { item, epoch, resourceId: id, bumpReloadKey } = ctx;

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

    const timestamp = useMemo(() => {
        return dayjs
            .utc(item.type === "group" ? item.tstamp[1] : item.tstamp)
            .local()
            .format("DD.MM.YYYY HH:mm:ss");
    }, [item]);

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

    const onClick = () => {
        confirm({
            title: gettext("Confirmation required"),
            // prettier-ignore
            content: gettextf("Please confirm reversion of the layer to version {timestamp} by {author}. This will revert all feature changes made after {timestamp}, but the changes will be kept in the history.")
            ({ author, timestamp }),

            okText: gettext("Revert"),
            onOk: revertToVersion,
        });
    };

    return {
        item: {
            key: "revert",
            label: gettext("Revert to this version"),
            onClick,
        },
        holder: (
            <>
                {confirmContextHolder}
                {messageContextHolder}
            </>
        ),
    };
}
