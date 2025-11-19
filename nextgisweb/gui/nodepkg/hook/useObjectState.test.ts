/** @testentry mocha */
import { act, renderHook } from "@testing-library/react";
import { assert } from "chai";

import { useObjectState } from "../hook/useObjectState";

export default () => {
    describe("useObjectState hook", () => {
        it("returns the initial object", () => {
            const { result } = renderHook(() => useObjectState({ a: 1, b: 2 }));

            assert.deepEqual(result.current[0], { a: 1, b: 2 });
        });

        it("does not change reference when objects are deeply equal", () => {
            const initial = { a: 1, b: 2 };

            const { result, rerender } = renderHook(
                (props) => useObjectState(props.obj),
                { initialProps: { obj: initial } }
            );

            const firstRef = result.current[0];

            rerender({ obj: { a: 1, b: 2 } });

            assert.strictEqual(result.current[0], firstRef);
        });

        it("changes reference when objects differ", () => {
            const { result, rerender } = renderHook(
                (props) => useObjectState(props.obj),
                { initialProps: { obj: { a: 1 } } }
            );

            const firstRef = result.current[0];

            rerender({ obj: { a: 2 } });

            assert.notStrictEqual(result.current[0], firstRef);
            assert.deepEqual(result.current[0], { a: 2 });
        });

        it("allows updating with setLocalObj", () => {
            const { result } = renderHook(() => useObjectState({ a: 1 }));

            const [, setObj] = result.current;

            act(() => {
                setObj({ a: 5 });
            });

            assert.deepEqual(result.current[0], { a: 5 });
        });
    });
};
