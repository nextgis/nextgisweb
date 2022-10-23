import { Modal } from "@nextgisweb/gui/antd";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { Body, Footer, TechInfo } from "./shared";

const DEFAULTS = {
    centered: true,
    width: "40em",
    transitionName: "",
    maskTransitionName: "",
};

export function ErrorModal({ error, visible: visibleInitial, ...props }) {
    const [visible, setVisible] = useState(visibleInitial ?? true);
    const tinfoState = useState(false);

    const close = () => setVisible(false);

    useEffect(() => {
        setVisible(visibleInitial);
    }, [visibleInitial]);

    return (
        <Modal
            {...DEFAULTS}
            {...props}
            title={error.title}
            open={visible}
            destroyOnClose
            onCancel={() => setVisible(false)}
            footer={<Footer tinfoState={tinfoState} onOk={close} />}
        >
            <Body error={error} />
            <TechInfo state={tinfoState} error={error} />
        </Modal>
    );
}

ErrorModal.propTypes = {
    error: PropTypes.shape({
        title: PropTypes.string,
    }),
    visible: PropTypes.bool,
};
