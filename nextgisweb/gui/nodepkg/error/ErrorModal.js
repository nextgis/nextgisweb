import { useEffect, useState } from "react";
import { Modal } from "@nextgisweb/gui/antd";
import { Body, Footer, TechInfo } from "./shared";

const DEFAULTS = {
    centered: true,
    width: "40em",
    transitionName: "",
    maskTransitionName: "",
};

export function ErrorModal({ error, ...props }) {
    const [visible, setVisible] = useState(props.visible ?? true);
    const tinfoState = useState(false);

    const close = () => setVisible(false);

    useEffect(() => {
        setVisible(props.visible);
    }, [props.visible]);

    return (
        <Modal
            {...DEFAULTS}
            {...props}
            title={error.title}
            visible={visible}
            destroyOnClose
            onCancel={() => setVisible(false)}
            footer={<Footer tinfoState={tinfoState} onOk={close} />}
        >
            <Body error={error} />
            <TechInfo state={tinfoState} error={error} />
        </Modal>
    );
}
