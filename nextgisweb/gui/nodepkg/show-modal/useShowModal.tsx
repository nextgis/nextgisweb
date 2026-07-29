import { useCallback, useEffect, useState } from "react";
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

  const showModal = useCallback(
    <P extends ShowModalOptions>(
      ModalComponent: ComponentType<P>,
      config?: P
    ) => {
      setIsLoading(true);
      const onReady = () => {
        config?.onReady?.();
        setIsLoading(false);
      };

      return showModalBase(
        (props: P) => <ModalComponent {...props} />,

        { modalStore, ...(config || ({} as P)), onReady }
      );
    },
    [modalStore]
  );

  useEffect(() => {
    return () => {
      modalStore.clean();
    };
  }, [modalStore]);

  return {
    showModal,
    isLoading,
    modalStore,
    modalHolder: <ModalHolder store={modalStore} />,
  };
}
