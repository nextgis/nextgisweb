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
        <>
            <Modal
                title="Table config"
                open={isOpen}
                nOk={close}
                onCancel={close}
                footer={null}
            >
                {fields.map((f) => {
                    const checked = visibleFields.includes(f.keyname);
                    return (
                        <Checkbox
                            key={f.keyname}
                            checked={checked}
                            onChange={() =>
                                setVisibleFields((old) => {
                                    if (checked) {
                                        return old.filter(
                                            (oldF) => oldF !== f.keyname
                                        );
                                    }
                                    return [...old, f.keyname];
                                })
                            }
                        >
                            {f.display_name}
                        </Checkbox>
                    );
                })}
            </Modal>
        </>
    );
}

TableConfigModal.propTypes = {
    fields: PropTypes.arrayOf(PropTypes.object),
    isOpen: PropTypes.bool,
    setIsOpen: PropTypes.func,
    setVisibleFields: PropTypes.func,
    visibleFields: PropTypes.arrayOf(PropTypes.string),
};
