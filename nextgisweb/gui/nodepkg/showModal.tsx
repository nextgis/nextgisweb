import type { ComponentType } from "react";

import { showModalBase } from "./show-modal/showModalBase";
import type { ShowModalOptions } from "./show-modal/showModalBase";

// Reexport for backward compatibility
export { ShowModalOptions };

/**
 * Avoid static calls outside React render to not lose context (theme, i18n, etc.).
 * Use useShowModal instead.
 */
export default function showModal<
    T extends ShowModalOptions = ShowModalOptions,
>(ModalComponent: ComponentType<T>, config?: T) {
    return showModalBase((props: T) => <ModalComponent {...props} />, config);
}
