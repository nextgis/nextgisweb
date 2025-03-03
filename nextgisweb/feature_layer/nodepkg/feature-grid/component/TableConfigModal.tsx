import { observer } from "mobx-react-lite";
import { useCallback } from "react";

import { CheckboxValue, Modal } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FeatureGridStore } from "../FeatureGridStore";
import { LAST_CHANGED_FIELD_ID } from "../constant";

const TableConfigModal = observer(({ store }: { store: FeatureGridStore }) => {
    const { settingsOpen, visibleFields, fields } = store;

    const close = () => {
        store.setSettingsOpen(false);
    };

    const toggle = useCallback(
        (fieldId: number, value: boolean) => {
            const old = store.visibleFields;
            const visibleFieald = !value
                ? old.filter((oldF) => oldF !== fieldId)
                : [...old, fieldId];
            store.setVisibleFields(visibleFieald);
        },
        [store]
    );

    return (
        <Modal open={settingsOpen} onOk={close} onCancel={close} footer={null}>
            {fields.map((f) => {
                return (
                    <div key={f.id}>
                        <CheckboxValue
                            value={visibleFields.includes(f.id)}
                            onChange={(value) => toggle(f.id, value)}
                        >
                            {f.display_name}
                        </CheckboxValue>
                    </div>
                );
            })}
            {store.versioning && (
                <>
                    <div>
                        <CheckboxValue
                            value={visibleFields.includes(
                                LAST_CHANGED_FIELD_ID
                            )}
                            onChange={(value) =>
                                toggle(LAST_CHANGED_FIELD_ID, value)
                            }
                        >
                            {gettext("Last changed")}
                        </CheckboxValue>
                    </div>
                </>
            )}
        </Modal>
    );
});

TableConfigModal.displayName = "TableConfigModal";
export default TableConfigModal;
