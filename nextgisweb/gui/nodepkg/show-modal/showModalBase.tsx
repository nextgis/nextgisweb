import type { ReactElement } from "react";

import type { Modal } from "@nextgisweb/gui/antd";
import type { ParamsOf } from "@nextgisweb/gui/type";
import { layoutStore } from "@nextgisweb/pyramid/layout";

import type { ModalStore } from "./ModalStore";

type ModalParams = ParamsOf<typeof Modal>;

export interface ShowModalOptions extends ModalParams {
    open?: boolean;
    close?: () => void;
    modalStore?: ModalStore;
}

export function showModalBase<T extends ShowModalOptions>(
    renderContent: (props: T) => ReactElement,
    { modalStore, ...config }: T = {} as T
) {
    const id = `modal-${Math.random().toString(36).slice(2)}`;

    const store = modalStore || layoutStore.modalStore;
    let currentConfig = {
        ...config,
        open: config?.open ?? true,
    } as T;

    const destroy = () => {
        store.remove(id);
    };

    const update = (configUpdate: T | ((prev: T) => T)) => {
        currentConfig =
            typeof configUpdate === "function"
                ? (configUpdate as (prev: T) => T)(currentConfig)
                : { ...currentConfig, ...configUpdate };

        store.update(
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

    store.add({ id, element: render() });

    return {
        destroy,
        close,
        update,
    };
}
