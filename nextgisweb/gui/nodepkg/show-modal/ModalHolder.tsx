import { observer } from "mobx-react-lite";
import { Fragment } from "react";

import type { ModalStore } from "./ModalStore";

export const ModalHolder = observer(({ store }: { store: ModalStore }) => {
    const { modalItems } = store;
    return modalItems.map(({ element, id }) => (
        <Fragment key={id}>{element}</Fragment>
    ));
});
ModalHolder.displayName = "ShowModals";
