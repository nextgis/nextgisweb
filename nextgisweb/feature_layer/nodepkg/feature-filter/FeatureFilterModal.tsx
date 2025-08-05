import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { Modal } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";

import { FeatureFilterEditor } from "./FeatureFilterEditor";
import "./FeatureFilterModal.less";

export interface FeatureFilterModalProps extends ShowModalOptions {
    fields: FeatureLayerFieldRead[];
    value?: string | undefined;
    onApply?: (filter: string | undefined) => void;
    open?: boolean;
    onCancel?: (e?: any) => void;
}

export const FeatureFilterModal = observer(
    ({
        fields,
        value,
        onApply,
        open: openProp,
        onCancel,
        ...modalProps
    }: FeatureFilterModalProps) => {
        const [open, setOpen] = useState(openProp ?? true);
        const [filter, setFilter] = useState<string | undefined>(value);

        useEffect(() => {
            if (openProp !== undefined) {
                setOpen(openProp);
            }
        }, [openProp]);

        const handleClose = () => {
            setOpen(false);
            onCancel?.(undefined);
        };

        const handleApply = () => {
            onApply?.(filter);
            handleClose();
        };

        const changeFilter = (filter: string | undefined) => {
            setFilter(filter);
        };

        return (
            <Modal
                className="ngw-feature-filter-modal"
                width="" // Do not set the default (520px) width
                open={open}
                onCancel={handleClose}
                centered
                destroyOnHidden
                footer={null}
                {...modalProps}
            >
                <FeatureFilterEditor
                    fields={fields}
                    value={value}
                    onChange={changeFilter}
                    onApply={handleApply}
                    onCancel={handleClose}
                />
            </Modal>
        );
    }
);

FeatureFilterModal.displayName = "FeatureFilterModal";
