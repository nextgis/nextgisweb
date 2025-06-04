import { useState } from "react";

import FeatureGrid from "@nextgisweb/feature-layer/feature-grid";
import { Modal } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { gettext } from "@nextgisweb/pyramid/i18n";

export type ModalProps = Parameters<typeof Modal>[0];

export interface FeatureDisplayModalProps extends ModalProps {
    resourceId: number;
    onPick: (val: number) => void;
}

export function FeatureSelectModal({
    open,
    resourceId,
    onCancel,
    onPick,
    ...modalProps
}: FeatureDisplayModalProps) {
    const [isLoading] = useState(false);

    return (
        <Modal
            className=""
            width="1000"
            centered={true}
            open={open}
            destroyOnClose
            footer={null}
            closable
            onCancel={onCancel}
            title={gettext("Select feature")}
            {...modalProps}
        >
            <div style={{ height: "500px", width: "1000px" }}>
                {isLoading ? (
                    <LoadingWrapper />
                ) : (
                    <FeatureGrid
                        id={resourceId}
                        isExportAllowed={false}
                        actions={[
                            {
                                title: "Pick",
                                disabled: (params) =>
                                    !params?.selectedIds?.length,
                                action: (params) => {
                                    const selectedIds = params?.selectedIds;
                                    if (selectedIds && selectedIds.length) {
                                        onPick(selectedIds[0]);
                                    }
                                },
                            },
                        ]}
                    />
                )}
            </div>
        </Modal>
    );
}
