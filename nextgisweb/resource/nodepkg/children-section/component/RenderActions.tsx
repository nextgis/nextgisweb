import { Tooltip } from "@nextgisweb/gui/antd";
import showModal from "@nextgisweb/gui/showModal";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import type { SvgIconLink as SvgIconLinkProps } from "@nextgisweb/gui/svg-icon/type";
import { DeleteConfirmModal } from "@nextgisweb/resource/delete-page/DeletePageModal";

import type {
    ChildrenResourceAction as Action,
    ChildrenResource,
} from "../type";
import { isDeleteAction } from "../util/isDeleteAction";
import { isPreviewAction } from "../util/isPreviewAction";
import { notifySuccessfulDeletion } from "../util/notify";

import { PreviewModal } from "./PreviewModal";

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
    const deleteModelItem = () => {
        const { destroy } = showModal(DeleteConfirmModal, {
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
        });
    };

    return actions.map((action) => {
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
                    const { destroy } = showModal(PreviewModal, {
                        resourceId: id,
                        href: href,
                        open: true,
                        onCancel: () => destroy(),
                    });
                },
            });
        } else if (isDeleteAction(action)) {
            return createActionBtn({
                onClick: () => deleteModelItem(),
            });
        } else {
            return createActionBtn({ href, target });
        }
    });
}
