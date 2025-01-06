import { useCallback, useState } from "react";

/**
 * Hook to track the loading state of multiple asynchronous operations,
 * especially useful when handling async operations with aborts.
 */
export const useLoading = () => {
    const [pendingPromises, setPendingPromises] = useState(0);

    const trackPromise = useCallback(<T>(promise: Promise<T>): Promise<T> => {
        setPendingPromises((count) => count + 1);
        return promise.then(
            (value) => {
                setPendingPromises((count) => count - 1);
                return value;
            },
            (reason) => {
                setPendingPromises((count) => count - 1);
                throw reason;
            }
        );
    }, []);

    const isLoading = pendingPromises > 0;

    return { isLoading, trackPromise };
};
