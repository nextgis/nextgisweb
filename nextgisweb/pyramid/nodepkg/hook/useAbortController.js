import { useEffect, useRef, useCallback } from "react";

import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";


export function useAbortController() {
    const abortHelper = useRef();

    const makeSignal = useCallback(() => {
        return abortHelper.current.makeSignal();
    }, []);

    const abort = useCallback(() => {
        abortHelper.current.abort();
    }, []);

    useEffect(() => {
        abortHelper.current =  new AbortControllerHelper()
        const abort_ = abortHelper.current.abort;
        return abort_;
    }, []);

    return { makeSignal, abort };
}
