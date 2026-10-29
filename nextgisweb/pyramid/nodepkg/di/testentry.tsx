/** @testentry mocha */
import { assert } from "chai";
import { StrictMode } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { InjectionContainer, InjectionProvider, useInjection } from ".";

export default () => {
  describe("Dependency injection", () => {
    it("caches each factory independently, including undefined results", () => {
      const container = new InjectionContainer();
      const createStore = (id: number) => ({ id });
      const first = container.get(createStore, 1);
      assert.strictEqual(container.get(createStore, 1), first);
      assert.notStrictEqual(
        container.get((id: number) => ({ id }), 1),
        first
      );

      let calls = 0;
      const createEmpty = () => {
        calls++;
        return undefined;
      };
      assert.isUndefined(container.get(createEmpty));
      assert.isUndefined(container.get(createEmpty));
      assert.strictEqual(calls, 1);
    });

    it("compares arguments", () => {
      const container = new InjectionContainer();
      const createStore = (value: number) => ({ value });
      const first = container.get(createStore, NaN);
      assert.strictEqual(container.get(createStore, NaN), first);
      assert.throws(() => container.get(createStore, 1));
    });

    it("shares one instance between sibling consumers", () => {
      const instances: object[] = [];
      const createStore = (id: number) => ({ id });
      function Consumer() {
        instances.push(useInjection(createStore, 1));
        return null;
      }

      renderToStaticMarkup(
        <InjectionProvider>
          <Consumer />
          <Consumer />
        </InjectionProvider>
      );
      assert.lengthOf(instances, 2);
      assert.strictEqual(instances[0], instances[1]);
    });

    it("isolates sibling and nested providers", () => {
      const instances: object[] = [];
      const createStore = () => ({});
      function Consumer() {
        instances.push(useInjection(createStore));
        return null;
      }

      renderToStaticMarkup(
        <>
          <InjectionProvider>
            <Consumer />
            <InjectionProvider>
              <Consumer />
            </InjectionProvider>
            <Consumer />
          </InjectionProvider>
          <InjectionProvider>
            <Consumer />
          </InjectionProvider>
        </>
      );
      assert.lengthOf(instances, 4);
      assert.strictEqual(instances[0], instances[2]);
      assert.notStrictEqual(instances[0], instances[1]);
      assert.notStrictEqual(instances[0], instances[3]);
    });

    it("reuses a supplied container across render passes", () => {
      const container = new InjectionContainer();
      const instances: object[] = [];
      let calls = 0;
      const createStore = () => ({ id: ++calls });
      function Consumer() {
        instances.push(useInjection(createStore));
        return null;
      }
      const render = (children: ReactNode) =>
        renderToStaticMarkup(
          <StrictMode>
            <InjectionProvider container={container}>
              {children}
            </InjectionProvider>
          </StrictMode>
        );

      render(<Consumer />);
      render(<Consumer />);
      assert.strictEqual(calls, 1);
      assert.strictEqual(instances[0], instances[1]);
    });

    it("requires a provider", () => {
      const createStore = () => ({});
      function Consumer() {
        useInjection(createStore);
        return null;
      }
      assert.throws(
        () => renderToStaticMarkup(<Consumer />),
        /InjectionProvider/
      );
    });
  });
};

// Checked by TypeScript; these invalid calls must never execute.
function TypeChecks() {
  const factory = (id: number) => ({ id });
  const store = useInjection(factory, 1);
  // @ts-expect-error The factory return type must be preserved.
  const invalidResult: string = store.id;
  // @ts-expect-error The factory argument must remain a number.
  useInjection(factory, "1");
  // @ts-expect-error Required factory arguments cannot be omitted.
  useInjection(factory);
  void invalidResult;
  return null;
}
void TypeChecks;
