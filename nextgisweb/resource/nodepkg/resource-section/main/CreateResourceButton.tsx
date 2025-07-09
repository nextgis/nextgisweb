import { Button } from "@nextgisweb/gui/antd";
import { AddIcon } from "@nextgisweb/gui/icon";
import { useShowModal } from "@nextgisweb/gui/show-modal/useShowModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

const msgCreateResource = gettext("Create resource");

interface CreateResourceButtonProps {
    resourceId: number;
    creatable: ResourceCls[];
}

export function CreateResourceButton({
    resourceId,
    creatable,
}: CreateResourceButtonProps) {
    const { modalHolder, lazyModal, isLoading } = useShowModal();

    return (
        <>
            {modalHolder}
            <Button
                type="primary"
                size="large"
                loading={isLoading}
                icon={<AddIcon />}
                onClick={() =>
                    lazyModal(() => import("./CreateResourceModal"), {
                        resourceId,
                        creatable,
                    })
                }
            >
                {msgCreateResource}
            </Button>
        </>
    );
}
