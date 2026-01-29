import { useEffect } from "react";

import type { FilterEditorStore } from "../FilterEditorStore";

export const useAutoScroll = (
    id: number,
    store: FilterEditorStore,
    domId: string
) => {
    useEffect(() => {
        if (store.scrollToItemId === id) {
            requestAnimationFrame(() => {
                const element = document.getElementById(domId);
                if (element) {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                    });
                    store.setScrollToItemId(null);
                }
            });
        }
    }, [store.scrollToItemId, id, store, domId]);
};
