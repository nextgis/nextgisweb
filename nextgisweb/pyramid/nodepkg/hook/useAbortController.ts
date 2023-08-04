import { useEffect, useRef } from "react";

import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";

export function useAbortController() {
    const abortHelper = useRef<AbortControllerHelper>();

    const makeSignal = useRef(() => {
        return abortHelper.current!.makeSignal();
    });

    const abort = useRef(() => {
        if (abortHelper.current) {
            abortHelper.current.abort();
        }
    });

    useEffect(() => {
        const abortHelper_ = new AbortControllerHelper();
        abortHelper.current = abortHelper_;
        return () => abortHelper_.abort();
    }, []);

    return { makeSignal: makeSignal.current, abort: abort.current };
}
