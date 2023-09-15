import { useEffect, useState, useRef } from "react";
import isEqual from "lodash-es/isEqual";

import { isEqualJSON } from "../util/isEqualJSON";

import type { Dispatch, SetStateAction } from "react";

interface UseObjectStateOptions {
    ignoreUndefined?: boolean;
}

/**
 * The useObjectState hook allows you to pass in an object to be tracked for changes.
 * It will only re-render components using the returned object if the passed in object changes by reference equality.
 * This avoids unnecessary re-renders when only the contents of the object change.
 */
export function useObjectState<O>(
    obj: O | ((prevState?: O) => O),
    { ignoreUndefined = false }: UseObjectStateOptions = {}
): [O, Dispatch<SetStateAction<O>>] {
    const [localObj, setLocalObj] = useState(obj);
    const prevVal = useRef(localObj);
    useEffect(() => {
        const isEqualFn = ignoreUndefined ? isEqualJSON : isEqual;

        const currentObj =
            typeof obj === "function"
                ? (obj as (prevState: O) => O)(prevVal.current)
                : obj;

        if (!isEqualFn(currentObj, prevVal.current)) {
            setLocalObj(currentObj);
        }
        prevVal.current = currentObj;
    }, [obj, ignoreUndefined]);

    return [localObj, setLocalObj];
}
