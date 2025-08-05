import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { Button, Modal } from "@nextgisweb/gui/antd";
import type { ShowModalOptions } from "@nextgisweb/gui/showModal";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FeatureFilterEditor } from "./FeatureFilterEditor";

const msgFilter = gettext("Filter");
const msgCancel = gettext("Cancel");
const msgApply = gettext("Apply");

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
        const [isValid, setIsValid] = useState(false);
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

        const onValidityChange = (isValid: boolean) => {
            setIsValid(isValid);
        };

        const changeFilter = (filter: string | undefined) => {
            setFilter(filter);
        };

        return (
            <Modal
                title={msgFilter}
                open={open}
                onCancel={handleClose}
                width={800}
                destroyOnHidden
                footer={[
                    <Button key="cancel" onClick={handleClose}>
                        {msgCancel}
                    </Button>,
                    <Button
                        key="apply"
                        onClick={handleApply}
                        disabled={!isValid}
                    >
                        {msgApply}
                    </Button>,
                ]}
                {...modalProps}
                className="filter-editor-modal"
                styles={{
                    body: {
                        maxHeight: "calc(50vh)",
                        overflowY: "auto",
                    },
                }}
            >
                <FeatureFilterEditor
                    fields={fields}
                    value={value}
                    onChange={changeFilter}
                    onValidityChange={onValidityChange}
                    showFooter={false}
                />
            </Modal>
        );
    }
);

FeatureFilterModal.displayName = "FeatureFilterModal";
