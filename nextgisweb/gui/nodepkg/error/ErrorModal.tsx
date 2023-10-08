import { useEffect, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";

import type { ParamsOf } from "../type";

import { Body, Footer, TechInfo } from "./shared";
import type { ApiError } from "./type";

type ModalProps = ParamsOf<typeof Modal>;

export interface ErrorModalProps extends ModalProps {
    error: ApiError;
}

const DEFAULTS = {
    centered: true,
    width: "40em",
    transitionName: "",
    maskTransitionName: "",
};

export function ErrorModal({
    error,
    open: open_,
    visible,
    ...props
}: ErrorModalProps) {
    const [open, setOpen] = useState(visible ?? open_ ?? true);
    const [tinfo, setTinfo] = useState(false);

    const close = () => setOpen(false);

    useEffect(() => {
        const isOpen = visible ?? open_;
        if (typeof isOpen === "boolean") {
            setOpen(isOpen);
        }
    }, [visible, open_]);

    return (
        <Modal
            {...DEFAULTS}
            {...props}
            title={error.title}
            open={open}
            destroyOnClose
            onCancel={() => setOpen(false)}
            footer={<Footer onOk={close} {...{ tinfo, setTinfo }} />}
        >
            <Body error={error} />
            {tinfo && <TechInfo error={error} />}
        </Modal>
    );
}
