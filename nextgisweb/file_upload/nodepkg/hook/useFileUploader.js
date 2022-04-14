import { useState, useEffect } from "react";
import { fileUploader } from "@nextgisweb/file-upload";

export function useFileUploader() {
    const [abortController, setAbortControl] = useState();

    useEffect(() => {
        return () => {
            abort();
        };
    }, []);

    const abort = () => {
        if (abortController) {
            abortController.abort();
        }
    };

    return [
        (options) => {
            abort();
            const newAbortControl = new AbortController();
            setAbortControl(newAbortControl);
            return fileUploader({ ...options, signal: newAbortControl.signal });
        },
        abort,
    ];
}
