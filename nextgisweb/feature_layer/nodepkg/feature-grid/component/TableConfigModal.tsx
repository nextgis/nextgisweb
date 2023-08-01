import PropTypes from "prop-types";

import { Modal, Checkbox } from "@nextgisweb/gui/antd";

export default function TableConfigModal({
    isOpen,
    fields,
    visibleFields,
    setVisibleFields,
    setIsOpen,
}) {
    const close = () => {
        setIsOpen(false);
    };

    return (
        <Modal open={isOpen} nOk={close} onCancel={close} footer={null}>
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

TableConfigModal.propTypes = {
    fields: PropTypes.arrayOf(PropTypes.object),
    isOpen: PropTypes.bool,
    setIsOpen: PropTypes.func,
    setVisibleFields: PropTypes.func,
    visibleFields: PropTypes.arrayOf(PropTypes.number),
};
