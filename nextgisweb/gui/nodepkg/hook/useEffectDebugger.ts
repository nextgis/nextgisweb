import { useEffect } from "react";
import type { DependencyList, EffectCallback } from "react";

import { usePrevious } from "./usePrevious";

/**
 * Based on https://stackoverflow.com/questions/55187563/determine-which-dependency-array-variable-caused-useeffect-hook-to-fire
 * Before:
 *
 * ```js
 * useEffect(() => {
 *   // useEffect code here...
 * }, [dep1, dep2])
 * ```
 *
 * After:
 *
 * ```js
 * useEffectDebugger(() => {
 *   // useEffect code here...
 * }, [dep1, dep2])
 * ```
 */
export function useEffectDebugger(
    effectHook: EffectCallback,
    dependencies: DependencyList,
    dependencyNames = []
) {
    const previousDeps = usePrevious(dependencies, []);

    const changedDeps = dependencies.reduce<DependencyList>(
        (accum, dependency, index) => {
            if (dependency !== previousDeps[index]) {
                const keyName = dependencyNames[index] || index;
                return {
                    ...accum,
                    [keyName]: {
                        before: previousDeps[index],
                        after: dependency,
                    },
                };
            }

            return accum;
        },
        {} as DependencyList
    );

    if (Object.keys(changedDeps).length) {
        console.log("[use-effect-debugger] ", changedDeps);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(effectHook, dependencies);
}
