import ReactDOM from "react-dom";

import type { ReactElement } from "react";
import type { Modal } from "@nextgisweb/gui/antd";
import { ParamsOf } from "@nextgisweb/gui/type";

type ModalParams = ParamsOf<typeof Modal>;

interface ShowModalOptions extends ModalParams {
    open?: boolean;
    /** @deprecated use {@link ShowModalOptions.open} instead */
    visible?: boolean;
    close?: () => void;
}

// Based on https://github.com/ant-design/ant-design/blob/master/components/modal/confirm.tsx
export default function showModal<
    T extends ShowModalOptions = ShowModalOptions,
>(ModalComponent: (props: T) => ReactElement, config: T) {
    const container = document.createDocumentFragment();
    let currentConfig: T = { ...config, open: true, visible: true };

    const render = ({ ...props }: T) => {
        setTimeout(() => {
            ReactDOM.render(
                <ModalComponent {...props}></ModalComponent>,
                container
            );
        });
    };

    const destroy = () => {
        ReactDOM.unmountComponentAtNode(container);
    };

    function close(): void {
        currentConfig = {
            ...currentConfig,
            visible: false,
            open: false,
            afterClose: () => {
                if (typeof config.afterClose === "function") {
                    config.afterClose();
                }

                destroy();
            },
        };
        render(currentConfig);
    }

    function update(configUpdate: T | ((conf: T) => T)) {
        if (typeof configUpdate === "function") {
            currentConfig = configUpdate(currentConfig);
        } else {
            currentConfig = {
                ...currentConfig,
                ...configUpdate,
            };
        }
        render(currentConfig);
    }

    currentConfig.close = close;

    render(currentConfig);

    return {
        destroy: close,
        close,
        update,
    };
}
