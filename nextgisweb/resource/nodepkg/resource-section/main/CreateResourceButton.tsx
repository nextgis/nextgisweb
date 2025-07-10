import { Button } from "@nextgisweb/gui/antd";
import { AddIcon } from "@nextgisweb/gui/icon";
import { useShowModal } from "@nextgisweb/gui/show-modal/useShowModal";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceCls } from "@nextgisweb/resource/type/api";
import topic from "@nextgisweb/webmap/compat/topic";

const msgCreateResource = gettext("Create resource");

interface CreateResourceButtonProps {
    resourceId: number;
    creatable: ResourceCls[];
}

export interface ResourceCompositeAddEvent {
    id: number;
    cls: ResourceCls;
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
                onClick={() => {
                    const selectResourceModal = lazyModal(
                        () => import("./CreateResourceModal"),
                        {
                            resourceId,
                            creatable,
                            onSelect: ({ cls }) => {
                                selectResourceModal.close();
                                const compositeModal = lazyModal(
                                    () =>
                                        import(
                                            "@nextgisweb/resource/composite/CompositeWidgetModal"
                                        ),
                                    {
                                        compositeProps: {
                                            setup: {
                                                cls,
                                                operation: "create",
                                                parent: resourceId,
                                            },
                                        },
                                        onSubmit: ({ id }) => {
                                            compositeModal.close();
                                            const eventData: ResourceCompositeAddEvent =
                                                { id, cls };
                                            topic.publish(
                                                "resource/composite/add",
                                                eventData
                                            );
                                        },
                                    }
                                );
                            },
                        }
                    );
                }}
            >
                {msgCreateResource}
            </Button>
        </>
    );
}
