import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { ConfigProvider } from "@nextgisweb/gui/antd";
import type { Modal } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";

type ModalParams = ParamsOf<typeof Modal>;

export interface ShowModalOptions extends ModalParams {
    open?: boolean;

    close?: () => void;
}

export function showModalBase<T extends ShowModalOptions>(
    renderContent: (props: T) => ReactElement,
    config: T
) {
    const container = document.createDocumentFragment();
    const root = createRoot(container);

    const {
        onCancel: originalOnCancel,
        afterClose: originalAfterClose,
        ...restConfig
    } = config;

    const destroy = () => {
        // To avoid attempt to synchronously unmount a root while React was already rendering.
        Promise.resolve().then(() => {
            root.unmount();
        });
    };

    const render = (props: T) => {
        root.render(<ConfigProvider>{renderContent(props)}</ConfigProvider>);
    };

    let currentConfig: T;

    const close = () => {
        currentConfig = {
            ...currentConfig,
            open: false,
        };
        render(currentConfig);
    };

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

    currentConfig = {
        ...restConfig,
        open: config.open ?? true,
        afterClose: () => {
            originalAfterClose?.();
            destroy();
        },
        onCancel: (e) => {
            originalOnCancel?.(e);
            close();
        },
        close,
    } as T;

    render(currentConfig);

    return {
        destroy,
        close,
        update,
    };
}
