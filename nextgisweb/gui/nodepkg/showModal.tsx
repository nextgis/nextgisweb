import type { ComponentType } from "react";

import { showModalBase } from "./showModalBase";
import type { ShowModalOptions } from "./showModalBase";

// Reexport for backward compatibility
export { ShowModalOptions };

export default function showModal<
    T extends ShowModalOptions = ShowModalOptions,
>(ModalComponent: ComponentType<T>, config: T) {
    return showModalBase((props: T) => <ModalComponent {...props} />, config);
}
