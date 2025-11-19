import { useCallback, useEffect, useRef } from "react";

import { AbortControllerHelper } from "@nextgisweb/pyramid/util/abort";

export function useAbortController() {
    const abortHelperRef = useRef<AbortControllerHelper | null>(null);

    const ensureHelper = useCallback(() => {
        if (!abortHelperRef.current) {
            abortHelperRef.current = new AbortControllerHelper();
        }
        return abortHelperRef.current;
    }, []);

    const makeSignal = useCallback(() => {
        const helper = ensureHelper();
        return helper.makeSignal();
    }, [ensureHelper]);

    const abort = useCallback((reason?: string) => {
        abortHelperRef.current?.abort(reason);
    }, []);

    useEffect(() => {
        const helper = ensureHelper();
        return () => {
            helper.abort();
        };
    }, [ensureHelper]);

    return { makeSignal, abort };
}
