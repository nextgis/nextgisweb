import { Tooltip } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { SvgIconLink } from "@nextgisweb/gui/svg-icon";
import type { SvgIconLink as SvgIconLinkProps } from "@nextgisweb/gui/svg-icon/type";
import { route } from "@nextgisweb/pyramid/api";

import type { ChildrenResource } from "../type";
import type { ChildrenResourceAction as Action } from "../type";
import { isDeleteAction } from "../util/isDeleteAction";
import { confirmThenDelete, notifySuccessfulDeletion } from "../util/notify";

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
        return route("resource.item", id)
            .delete()
            .then(() => {
                setTableItems((old) => old.filter((x) => x.id !== id));
                notifySuccessfulDeletion(1);
            })
            .catch((err) => {
                errorModal(err);
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
        if (isDeleteAction(action)) {
            return createActionBtn({
                onClick: () => confirmThenDelete(deleteModelItem),
            });
        }
        return createActionBtn({ href, target });
    });
}
