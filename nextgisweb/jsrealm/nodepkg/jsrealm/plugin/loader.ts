import { BaseRegistry } from "./registry";

type Value = NonNullable<unknown>;
type Metadata = NonNullable<unknown>;

interface NoMetadata {}

type PromiseLoader<V extends Value> = (...args: []) => Promise<V>;
type ImportLoader<V extends Value> = PromiseLoader<{ default: V }>;
type Loader<V extends Value> = PromiseLoader<V> | ImportLoader<V>;

export class LoaderObject<V extends Value, M extends Metadata> {
    readonly component: string;
    readonly #loader: Loader<V>;

    #promise?: Promise<V>;
    #value?: V;

    constructor(component: string, loader: Loader<V>, meta?: M) {
        this.component = component;
        this.#loader = loader;
        Object.assign(this, meta);
    }

    async load(): Promise<V> {
        if (this.#value !== undefined) return this.#value;
        this.#promise ??= this.#loader().then((data) =>
            data && typeof data === "object" && "default" in data
                ? data.default
                : data
        );
        this.#value = await this.#promise;
        return this.#value;
    }
}

type LoaderPlugin<V extends Value, M extends Metadata> = LoaderObject<V, M> &
    Readonly<M>;

export class LoaderRegistry<
    V extends Value = Value,
    M extends Metadata = NoMetadata,
> extends BaseRegistry<LoaderPlugin<V, M>, M> {
    /**
     * Register plugin using loader function
     *
     * @param component Use {@link COMP_ID} global
     * @param loader Zero-argument function returning plugin value
     * @param meta Plugin metadata
     *
     * @example
     * registry.register(COMP_ID, () => import("./module"), {foo: "bar"})
     */
    registerLoader(component: string, loader: Loader<V>, meta?: M): void {
        this._register(component, () => {
            const plugin = new LoaderObject<V, M>(component, loader, meta);
            return plugin as LoaderPlugin<V, M>;
        });
    }

    /**
     * Register plugin value directly
     *
     * @param component Use {@link COMP_ID} global
     * @param value Plugin value
     * @param meta Plugin metadata
     *
     * @example
     * registry.register(COMP_ID, {
     *     store: () => import("./Store"),
     *     widget: () => import("./Widget"),
     * })
     */
    registerValue(component: string, value: V, meta?: M): void {
        this.registerLoader(component, async () => value, meta);
    }

    /** @deprecated Use {@link registerLoader} or {@link registerValue} */
    register(component: string, loader: Loader<V>, meta?: M): void {
        this.registerLoader(component, loader, meta);
    }
}

/**
 * Create loader registry
 *
 * @typeParam V Type of value
 * @typeParam M Type of metadata
 *
 * @param identity Use {@link MODULE_NAME} global
 * @returns LoaderRegistry instance
 */
export function loaderRegistry<
    V extends Value,
    M extends Metadata = NoMetadata,
>(identity: string): LoaderRegistry<V, M> {
    return new LoaderRegistry<V, M>(identity);
}
