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

// Based on https://github.com/ant-design/ant-design/blob/master/components/modal/confirm.tsx
export default function showModal<
    T extends ShowModalOptions = ShowModalOptions,
>(ModalComponent: (props: T) => ReactElement, config: T) {
    const container = document.createDocumentFragment();

    config = handleVisibleDeprecation(config);

    let currentConfig: T = { ...config, open: config.open ?? true };

    const root = createRoot(container);

    const render = (props: T) => {
        root.render(
            <ConfigProvider>
                <ModalComponent {...props} />
            </ConfigProvider>
        );
    };

    const close = () => {
        currentConfig = {
            ...currentConfig,
            open: false,
            afterClose: () => {
                if (typeof config.afterClose === "function") {
                    config.afterClose();
                }
                root.unmount();
            },
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

    currentConfig.close = close;

    render(currentConfig);

    return {
        destroy: close,
        close,
        update,
    };
}
