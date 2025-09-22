import { useEffect, useState } from "react";

import { Modal } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { ModalStore } from "../show-modal/ModalStore";
import showModal from "../showModal";
import type { ParamsOf } from "../type";

import { extractError } from "./extractError";
import type { ErrorInfo } from "./extractError";
import { Body, Footer, TechInfo } from "./shared";
import { isAbortError } from "./util";

type ModalProps = ParamsOf<typeof Modal>;

export interface ErrorModalProps extends ModalProps {
    error: ErrorInfo;
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

    const title =
        "title" in error && typeof error.title === "string"
            ? error.title
            : gettext("Error");

    return (
        <Modal
            {...DEFAULTS}
            {...props}
            title={title}
            open={open}
            destroyOnHidden
            onCancel={() => setOpen(false)}
            footer={<Footer onOk={close} {...{ tinfo, setTinfo }} />}
        >
            <Body error={error} />
            {tinfo && <TechInfo error={error} />}
        </Modal>
    );
}

interface ErrorModalOpts extends Partial<ErrorModalProps> {
    ignoreAbort?: boolean;
    modalStore?: ModalStore;
}

export function errorModal(error: unknown, opts?: ErrorModalOpts): boolean {
    const { ignoreAbort = true, ...props } = opts ?? {};
    if (ignoreAbort && isAbortError(error)) return false;

    if (window.ngwSentry && error instanceof Error) {
        window.ngwSentry.captureException(error);
    }

    showModal(ErrorModal, { error: extractError(error), ...props });
    return true;
}

export function errorModalUnlessAbort(
    error: unknown,
    opts?: Omit<ErrorModalOpts, "ignoreAbortError">
): boolean {
    return errorModal(error, { ignoreAbort: true, ...opts });
}
