import { Modal } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { FeatureInfoSection } from "@nextgisweb/webmap/panel/identify/component/FeatureInfoSection";

import "./FeatureDisplayModal.less";

export type ModalProps = Parameters<typeof Modal>[0];

export interface FeatureDisplayModalProps extends ModalProps {
    featureId: number;
    resourceId: number;
}

export function FeatureDisplayModal({
    open,
    featureId,
    resourceId,
    onCancel,
    ...modalProps
}: FeatureDisplayModalProps) {
    const { data: featureItem, isLoading } = useRouteGet(
        "feature_layer.feature.item",
        {
            id: resourceId,
            fid: featureId,
        },
        { query: { label: true } }
    );

    return (
        <>
            <Modal
                className="ngw-feature-layer-feature-display-modal"
                width="" // Do not set the default (520px) width
                centered={true}
                open={open}
                destroyOnClose
                footer={null}
                closable
                onCancel={onCancel}
                title={isLoading ? "..." : featureItem.label}
                {...modalProps}
            >
                {isLoading ? (
                    <LoadingWrapper />
                ) : (
                    <FeatureInfoSection
                        showGeometryInfo
                        resourceId={resourceId}
                        featureItem={featureItem}
                    />
                )}
            </Modal>
        </>
    );
}
