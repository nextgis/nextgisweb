import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useState } from "react";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { Modal } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";

import { FeatureFilterEditor } from "./FeatureFilterEditor";
import "./FeatureFilterModal.less";
import type { FilterExpressionString } from "./type";

export interface FeatureFilterModalProps extends ShowModalOptions {
    fields: FeatureLayerFieldRead[];
    value?: FilterExpressionString | undefined;
    onApply?: (filter: FilterExpressionString | undefined) => void;
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
        const [filter, setFilter] = useState<
            FilterExpressionString | undefined
        >(value);

        useEffect(() => {
            if (openProp !== undefined) {
                setOpen(openProp);
            }
        }, [openProp]);

        const handleClose = useCallback(() => {
            setOpen(false);
            onCancel?.(undefined);
        }, [onCancel]);

        const handleApply = useCallback(() => {
            onApply?.(filter);
            handleClose();
        }, [filter, handleClose, onApply]);

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
                    onChange={setFilter}
                    onApply={handleApply}
                    onCancel={handleClose}
                />
            </Modal>
        );
    }
);

FeatureFilterModal.displayName = "FeatureFilterModal";
