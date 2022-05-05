import { useEventListener } from "./useEventListener";

export function useKeydownListener(key, handler, element = window) {
    function handler_(e) {
        if (e.key && e.key.toLowerCase() === key.toLowerCase()) {
            handler(e);
        }
    }
    useEventListener("keydown", handler_, element);
}
