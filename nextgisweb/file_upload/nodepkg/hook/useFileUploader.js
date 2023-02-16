import { fileUploader } from "@nextgisweb/file-upload";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";

export function useFileUploader() {
    const { makeSignal, abort } = useAbortController();

    return {
        upload: (options) => {
            abort();
            return fileUploader({ ...options, signal: makeSignal() });
        },
        abort,
    };
}
