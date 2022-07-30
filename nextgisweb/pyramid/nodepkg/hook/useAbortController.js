import { useEffect, useState } from "react";

export function useAbortController() {
    const [controllers, setControllers] = useState([]);

    const makeSignal = () => {
        const abortController = new AbortController();
        setControllers((old) => [...old, abortController]);
        return abortController.signal;
    };

    const abort = () => {
        for (const a of controllers) {
            a.abort();
        }
        setControllers([]);
    };

    useEffect(() => {
        return () => {
            abort();
        };
    }, []);

    return { makeSignal, abort };
}
