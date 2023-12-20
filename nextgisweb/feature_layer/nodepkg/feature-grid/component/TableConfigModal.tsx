import { observer } from "mobx-react-lite";

import { Checkbox, Modal } from "@nextgisweb/gui/antd";

import type { FeatureGridStore } from "../FeatureGridStore";

export default observer(({ store }: { store: FeatureGridStore }) => {
    const { settingsOpen, visibleFields, fields } = store;

    const close = () => {
        store.setSettingsOpen(false);
    };

    return (
        <Modal open={settingsOpen} onOk={close} onCancel={close} footer={null}>
            {fields.map((f) => {
                const checked = visibleFields.includes(f.id);
                return (
                    <div key={f.id}>
                        <Checkbox
                            checked={checked}
                            onChange={() => {
                                const old = store.visibleFields;
                                const visibleFieald = checked
                                    ? old.filter((oldF) => oldF !== f.id)
                                    : [...old, f.id];
                                store.setVisibleFields(visibleFieald);
                            }}
                        >
                            {f.display_name}
                        </Checkbox>
                    </div>
                );
            })}
        </Modal>
    );
});
