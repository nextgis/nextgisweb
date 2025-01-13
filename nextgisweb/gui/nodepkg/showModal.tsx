import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { ConfigProvider } from "@nextgisweb/gui/antd";
import type { Modal } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";

type ModalParams = ParamsOf<typeof Modal>;

export interface ShowModalOptions extends ModalParams {
    open?: boolean;
    /** @deprecated use {@link ShowModalOptions.open} instead */
    visible?: boolean;
    close?: () => void;
}

function handleVisibleDeprecation<T extends ShowModalOptions>(config: T): T {
    if (config.visible !== undefined) {
        console.warn(
            "The 'visible' prop is deprecated. Please use 'open' instead."
        );
        if (config.open === undefined) {
            config.open = config.visible;
        }
    }
    // Remove the 'visible' prop from the config
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { visible, ...restConfig } = config;
    return restConfig as T;
}

export default function showModal<
    T extends ShowModalOptions = ShowModalOptions,
>(ModalComponent: (props: T) => ReactElement, config: T) {
    const container = document.createDocumentFragment();
    const root = createRoot(container);

    config = handleVisibleDeprecation(config);
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
        root.render(
            <ConfigProvider>
                <ModalComponent {...props} />
            </ConfigProvider>
        );
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
            configUpdate = handleVisibleDeprecation(configUpdate);
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
