import { Checkbox, Modal } from "@nextgisweb/gui/antd";

import type { Dispatch, SetStateAction } from "react";
import type { FeatureLayerField } from "../../type/FeatureLayer";

interface TableConfigModal {
    isOpen?: boolean;
    fields: FeatureLayerField[];
    visibleFields: number[];
    setVisibleFields: Dispatch<SetStateAction<number[]>>;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export default function TableConfigModal({
    isOpen,
    fields,
    visibleFields,
    setVisibleFields,
    setIsOpen,
}: TableConfigModal) {
    const close = () => {
        setIsOpen(false);
    };

    return (
        <Modal open={isOpen} onOk={close} onCancel={close} footer={null}>
            {fields.map((f) => {
                const checked = visibleFields.includes(f.id);
                return (
                    <div key={f.id}>
                        <Checkbox
                            checked={checked}
                            onChange={() =>
                                setVisibleFields((old) => {
                                    if (checked) {
                                        return old.filter(
                                            (oldF) => oldF !== f.id
                                        );
                                    }
                                    return [...old, f.id];
                                })
                            }
                        >
                            {f.display_name}
                        </Checkbox>
                    </div>
                );
            })}
        </Modal>
    );
}
