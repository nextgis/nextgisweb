import type { ReactElement } from "react";

import type { Modal } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";
import { layoutStore } from "@nextgisweb/pyramid/layout";

type ModalParams = ParamsOf<typeof Modal>;

export interface ShowModalOptions extends ModalParams {
    open?: boolean;

    close?: () => void;
}

export function showModalBase<T extends ShowModalOptions>(
    renderContent: (props: T) => ReactElement,
    config: T
) {
    const id = `modal-${Math.random().toString(36).slice(2)}`;

    let currentConfig = {
        ...config,
        open: config.open ?? true,
    } as T;

    const destroy = () => {
        layoutStore.removeModalItem(id);
    };

    const update = (configUpdate: T | ((prev: T) => T)) => {
        currentConfig =
            typeof configUpdate === "function"
                ? (configUpdate as (prev: T) => T)(currentConfig)
                : { ...currentConfig, ...configUpdate };

        layoutStore.updateModalItem(
            id,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            render()
        );
    };

    function close() {
        update({ open: false } as T);
    }

    const render = (): ReactElement => {
        const {
            onCancel: originalOnCancel,
            afterClose: originalAfterClose,
            ...restConfig
        } = currentConfig;

        const propsForRender = {
            ...restConfig,
            open: currentConfig.open!,
            onCancel: (e) => {
                originalOnCancel?.(e);
                update({ open: false } as T);
            },
            afterClose: () => {
                originalAfterClose?.();
                destroy();
            },
            close: () => update({ open: false } as T),
        } as T;

        return renderContent(propsForRender);
    };

    layoutStore.addModalItem({ id, element: render() });

    return {
        destroy,
        close,
        update,
    };
}
