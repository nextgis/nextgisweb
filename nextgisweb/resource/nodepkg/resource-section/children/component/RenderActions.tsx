import { useShowModal } from "@nextgisweb/gui";
import { Tooltip } from "@nextgisweb/gui/antd";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import type { SvgIconLink as SvgIconLinkProps } from "@nextgisweb/gui/svg-icon/type";
import { useResourceNotify } from "@nextgisweb/resource/hook/useResourceNotify";

import type {
    ChildrenResourceAction as Action,
    ChildrenResource,
} from "../type";
import { isDeleteAction } from "../util/isDeleteAction";
import { isPreviewAction } from "../util/isPreviewAction";

interface RenderActionsProps {
    actions: Action[];
    id: number;
    setTableItems: React.Dispatch<React.SetStateAction<ChildrenResource[]>>;
}

export function RenderActions({
    actions,
    id,
    setTableItems,
}: RenderActionsProps) {
    const { notifySuccessfulDeletion, contextHolder } = useResourceNotify();
    const { lazyModal, modalHolder } = useShowModal();

    const deleteModelItem = () => {
        const { destroy } = lazyModal(
            () => import("@nextgisweb/resource/delete-page/DeletePageModal"),
            {
                onCancelDelete: () => {
                    destroy();
                },
                onOkDelete: () => {
                    destroy();
                    setTableItems((old) => old.filter((x) => x.id !== id));
                    notifySuccessfulDeletion(1);
                },
                // modal mask not clickable without onCancel
                onCancel: () => {
                    destroy();
                },
                resources: [id],
            }
        );
    };

    return (
        <>
            {contextHolder}
            {modalHolder}
            {actions.map((action) => {
                const { target, href, icon, title } = action;

                const createActionBtn = (props_: SvgIconLinkProps) => (
                    <Tooltip key={title} title={title}>
                        <SvgIconLink
                            {...props_}
                            icon={icon}
                            fill="currentColor"
                        ></SvgIconLink>
                    </Tooltip>
                );
                if (isPreviewAction(action)) {
                    return createActionBtn({
                        onClick: () => {
                            const { destroy } = lazyModal(
                                () => import("./PreviewModal"),
                                {
                                    resourceId: id,
                                    href: href,
                                    open: true,
                                    onCancel: () => destroy(),
                                }
                            );
                        },
                    });
                } else if (isDeleteAction(action)) {
                    return createActionBtn({
                        onClick: () => deleteModelItem(),
                    });
                } else {
                    return createActionBtn({ href, target });
                }
            })}
        </>
    );
}
