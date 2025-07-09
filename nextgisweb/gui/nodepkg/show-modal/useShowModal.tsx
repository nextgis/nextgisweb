import { Suspense, lazy, useEffect, useState } from "react";
import type { ComponentType } from "react";

import { ModalHolder } from "./ModalHolder";
import { ModalStore } from "./ModalStore";
import { showModalBase } from "./showModalBase";
import type { ShowModalOptions } from "./showModalBase";

export function useShowModal({
    modalStore: modalStoreProp,
}: {
    modalStore?: ModalStore;
} = {}) {
    const [modalStore] = useState(() => modalStoreProp || new ModalStore());

    const [isLoading, setIsLoading] = useState(false);

    function showModal<P extends ShowModalOptions>(
        ModalComponent: ComponentType<P>,
        config?: P
    ) {
        return showModalBase(
            (props: P) => <ModalComponent {...props} />,

            { modalStore, ...(config || ({} as P)) }
        );
    }

    function lazyModal<P extends ShowModalOptions>(
        getModalComponent: () => Promise<{ default: ComponentType<P> }>,
        config: P
    ) {
        setIsLoading(true);

        const wrappedLoader = async () => {
            try {
                return await getModalComponent();
            } finally {
                setIsLoading(false);
            }
        };

        const ModalComponent = lazy(wrappedLoader);

        return showModalBase(
            (props: P) => (
                <Suspense fallback={null}>
                    <ModalComponent {...props} />
                </Suspense>
            ),
            { modalStore, ...(config || ({} as P)) }
        );
    }

    useEffect(() => {
        return () => {
            modalStore.clean();
        };
    }, [modalStore]);

    return {
        showModal,
        lazyModal,
        isLoading,
        modalStore,
        modalHolder: <ModalHolder store={modalStore} />,
    };
}
