import { useEventListener } from "./useEventListener";

export function useKeydownListener(
    key: string,
    handler: (e: KeyboardEvent) => void
) {
    function handler_(e: KeyboardEvent) {
        if (e.key && e.key.toLowerCase() === key.toLowerCase()) {
            handler(e);
        }
    }
    useEventListener("keydown", handler_);
}
