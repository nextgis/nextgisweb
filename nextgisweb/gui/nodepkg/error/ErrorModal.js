import { useEffect, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";

import { Body, Footer, TechInfo } from "./shared";

const DEFAULTS = {
    centered: true,
    width: "40em",
    transitionName: "",
    maskTransitionName: "",
};

export function ErrorModal({ error, visible: visibleInitial, ...props }) {
    const [visible, setVisible] = useState(visibleInitial ?? true);
    const [tinfo, setTinfo] = useState(false);

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
            footer={<Footer onOk={close} {...{ tinfo, setTinfo }} />}
        >
            <Body error={error} />
            {tinfo && <TechInfo error={error} />}
        </Modal>
    );
}
