import { useCallback, useEffect, useRef, useState } from "react";

interface UseUnsavedChangesProps {
    dirty: boolean;
    initiallyEnabled?: boolean;
}

export function useUnsavedChanges({
    dirty,
    initiallyEnabled = true,
}: UseUnsavedChangesProps) {
    const [enabled, setEnabled] = useState(initiallyEnabled);
    const stateRef = useRef({ dirty, enabled });

    useEffect(() => {
        stateRef.current = { dirty, enabled };
    }, [dirty, enabled]);

    const alertUnsaved = useCallback((event: BeforeUnloadEvent) => {
        if (stateRef.current.dirty && stateRef.current.enabled) {
            event.preventDefault();
            event.returnValue = "";
        }
    }, []);

    useEffect(() => {
        window.addEventListener("beforeunload", alertUnsaved);
        return () => {
            window.removeEventListener("beforeunload", alertUnsaved);
        };
    }, [alertUnsaved]);

    const enable = useCallback(() => {
        if (!stateRef.current.enabled) {
            window.addEventListener("beforeunload", alertUnsaved);
        }
        setEnabled(true);
    }, [alertUnsaved]);

    const disable = useCallback(() => {
        setEnabled(false);
        window.removeEventListener("beforeunload", alertUnsaved);
    }, [alertUnsaved]);

    return { enable, disable };
}
