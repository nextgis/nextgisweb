import { useEffect, useRef } from "react";

import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";

export function useAbortController() {
    const abortHelper = useRef<AbortControllerHelper | null>(null);

    const makeSignal = useRef(() => {
        if (!abortHelper.current) {
            abortHelper.current = new AbortControllerHelper();
        }
        return abortHelper.current.makeSignal();
    });

    const abort = useRef((reason?: string) => {
        if (abortHelper.current) {
            abortHelper.current.abort(reason);
        }
    });

    useEffect(() => {
        if (!abortHelper.current) {
            abortHelper.current = new AbortControllerHelper();
        }
        const abortHelper_ = abortHelper.current;
        return () => {
            abortHelper_.abort();
        };
    }, []);

    return { makeSignal: makeSignal.current, abort: abort.current };
}
