import { useEffect, useState } from "react";
import isEqual from "lodash-es/isEqual";

import type { Dispatch, SetStateAction } from "react";

/**
 * The useObjectState hook allows you to pass in an object to be tracked for changes.
 * It will only re-render components using the returned object if the passed in object changes by reference equality.
 * This avoids unnecessary re-renders when only the contents of the object change.
 */
export function useObjectState<O>(obj: O): [O, Dispatch<SetStateAction<O>>] {
    const [localObj, setLocalObj] = useState(obj);
    useEffect(() => {
        if (!isEqual(obj, localObj)) {
            setLocalObj(obj);
        }
    }, [obj, localObj]);
    return [localObj, setLocalObj];
}
