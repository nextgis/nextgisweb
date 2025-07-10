import { Suspense, lazy } from "react";
import type { ComponentType } from "react";

import { showModalBase } from "./show-modal/showModalBase";
import type { ShowModalOptions } from "./show-modal/showModalBase";

export { ShowModalOptions };

/**
 * Avoid static calls outside React render to not lose context (theme, i18n, etc.).
 * Use useShowModal instead.
 */
export default function showModalLazy<
    T extends ShowModalOptions = ShowModalOptions,
>(getModalComponent: () => Promise<{ default: ComponentType<T> }>, config: T) {
    const ModalComponent = lazy(
        getModalComponent as () => Promise<{ default: ComponentType<any> }>
    );
    return showModalBase(
        (props) => (
            <Suspense fallback={null}>
                <ModalComponent {...props} />
            </Suspense>
        ),
        config
    );
}
