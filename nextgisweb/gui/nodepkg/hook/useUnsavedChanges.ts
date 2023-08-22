import { useEffect } from "react";

interface UseUnsavedChangesProps {
    dirty: boolean;
}

export function useUnsavedChanges({ dirty }: UseUnsavedChangesProps) {
    useEffect(() => {
        const alertUnsaved = (event: BeforeUnloadEvent) => {
            if (dirty) {
                event.preventDefault();
                event.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", alertUnsaved);

        return () => {
            window.removeEventListener("beforeunload", alertUnsaved);
        };
    }, [dirty]);
}
