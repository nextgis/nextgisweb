import { matches } from "lodash-es";

type Value = NonNullable<unknown>;
type Metadata = NonNullable<unknown>;

interface NoMetadata {}

type PromiseLoader<V extends Value> = (...args: []) => Promise<V>;
type ImportLoader<V extends Value> = PromiseLoader<{ default: V }>;

type Loader<V extends Value> = PromiseLoader<V> | ImportLoader<V>;

class PluginObject<V extends Value, M extends Metadata> {
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

type Plugin<V extends Value, M extends Metadata> = PluginObject<V, M> &
    Readonly<M>;

type Selector<M> = { component: string } & M;

type Query<M extends Metadata> =
    | ((i: Selector<M>) => boolean)
    | Partial<Selector<M>>;

export class PluginRegistry<
    V extends Value = Value,
    M extends Metadata = NoMetadata,
> {
    readonly identity: string;
    protected readonly items = new Array<Plugin<V, M>>();
    protected _sealed = false;
    protected _skipped = 0;

    constructor(identity: string) {
        this.identity = identity;
    }

    protected _register(component: string, fn: () => Plugin<V, M>): void {
        if (this._sealed) {
            throw new Error(`Registry '${this.identity}' already sealed`);
        }

        if (!ngwConfig.components.includes(component)) {
            this._skipped += 1;
            return;
        }

        this.items.push(fn());
    }

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
            const plugin = new PluginObject<V, M>(component, loader, meta);
            return plugin as Plugin<V, M>;
        });
    }

    /**
     * Register plugin value directly
     *
     * Useful for registries without plugin metadata, which manage asynchronous
     * loading themselves.
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

    /** Seal registry to prevent future plugin registrations */
    seal() {
        this._sealed = true;
        console.debug(
            `Registry '${this.identity}': ` +
                `${this.items.length} registered, ` +
                `${this._skipped} skipped`
        );
    }

    /** Get registry status for testing purposes */
    status() {
        return {
            sealed: this._sealed,
            count: this.items.length,
            skipped: this._skipped,
        };
    }

    *query(query?: Query<M>) {
        if (!this._sealed)
            throw new Error(`Registry '${this.identity}' hasn't been sealed`);

        if (query === undefined) query = () => true;
        else if (typeof query !== "function") query = matches(query);

        for (const itm of this.items) {
            if (query(itm as Selector<M>)) yield itm;
        }
    }

    queryAll(query?: Query<M>) {
        return Array.from(this.query(query));
    }

    queryOne(query?: Query<M>) {
        let found = undefined;
        for (const plugin of this.query(query)) {
            if (found === undefined) {
                found = plugin;
            } else {
                throw new Error("Multiple plugins found!");
            }
        }

        if (found === undefined) {
            throw new Error("No plugin found!");
        }

        return found;
    }
}

export function pluginRegistry<
    V extends Value,
    M extends Metadata = NoMetadata,
>(
    identity: string
): Pick<
    PluginRegistry<V, M>,
    | "register"
    | "registerLoader"
    | "registerValue"
    | "query"
    | "queryAll"
    | "queryOne"
> {
    return new PluginRegistry<V, M>(identity);
}
