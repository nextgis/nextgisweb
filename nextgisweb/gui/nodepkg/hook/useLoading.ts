import { useCallback, useState } from "react";

/**
 * Hook to track the loading state of multiple asynchronous operations,
 * especially useful when handling async operations with aborts.
 */
export const useLoading = () => {
    const [pendingPromises, setPendingPromises] = useState(0);

    const trackPromise = useCallback(<T>(promise: Promise<T>): Promise<T> => {
        setPendingPromises((count) => count + 1);

        promise
            .catch(() => {
                // Supress errors to avoid logging them in the console
            })
            .finally(() => {
                setPendingPromises((count) => count - 1);
            });

        return promise;
    }, []);

    const isLoading = pendingPromises > 0;

    return { isLoading, trackPromise };
};
