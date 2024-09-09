import { Suspense, lazy, useCallback, useState } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { AddIcon } from "@nextgisweb/gui/icon";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceCls } from "@nextgisweb/resource/type/api";

const msgCreateResource = gettext("Create resource");

const LazyModal = lazy(() => import("./CreateResourceModal"));

interface CreateResourceButtonProps {
    resourceId: number;
    creatable: ResourceCls[];
}

export function CreateResourceButton({
    resourceId,
    creatable,
}: CreateResourceButtonProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalWasOpen, setModalWasOpen] = useState(false);

    const showModal = useCallback(() => {
        setModalOpen(true);
        setModalWasOpen(true);
    }, []);

    const hideModal = useCallback(() => {
        setModalOpen(false);
    }, []);

    return (
        <>
            <Button
                type="primary"
                size="large"
                icon={<AddIcon />}
                onClick={showModal}
            >
                {msgCreateResource}
            </Button>
            {modalWasOpen && (
                <Suspense>
                    <LazyModal
                        resourceId={resourceId}
                        creatable={creatable}
                        open={modalOpen}
                        onCancel={hideModal}
                    />
                </Suspense>
            )}
        </>
    );
}
