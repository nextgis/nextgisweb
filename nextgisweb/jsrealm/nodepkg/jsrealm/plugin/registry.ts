import { matches } from "lodash-es";

type Value = NonNullable<unknown>;
type Metadata = NonNullable<unknown>;

interface NoMetadata {}

type PromiseLoader<V extends Value> = () => Promise<V>;
type ImportLoader<V extends Value> = PromiseLoader<{ default: V }>;

class PluginObject<V extends Value> {
    readonly component: string;
    readonly #loader: PromiseLoader<V>;

    #promise?: Promise<V>;
    #value?: V;

    constructor(component: string, loader: PromiseLoader<V>) {
        this.component = component;
        this.#loader = loader;
    }

    async load(): Promise<V> {
        if (this.#value !== undefined) return this.#value;
        if (this.#promise === undefined) this.#promise = this.#loader();
        this.#value = await this.#promise;
        return this.#value;
    }
}

type Plugin<
    V extends Value,
    M extends Metadata,
> = keyof M extends keyof PluginObject<Value>
    ? keyof M extends keyof NoMetadata
        ? PluginObject<V>
        : never /* Key conflicts guard */
    : PluginObject<V> & Readonly<M>;

type RegisterValue<V extends Value> =
    | { sync: V }
    | { promise: PromiseLoader<V> }
    | { import: ImportLoader<V> };

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

    register(meta: { component: string } & M, value: RegisterValue<V>) {
        if (this._sealed)
            throw new Error(`Registry '${this.identity}' already sealed`);

        const { component, ...metaRest } = meta;
        if (!ngwConfig.components.includes(component)) {
            this._skipped += 1;
            return;
        }

        let loader: PromiseLoader<V>;
        if ("sync" in value) {
            loader = () => new Promise((resolve) => resolve(value.sync));
        } else if ("promise" in value) {
            loader = value.promise;
        } else if ("import" in value) {
            loader = () =>
                new Promise((resolve) => {
                    value.import().then((mod) => {
                        resolve(mod.default);
                    });
                });
        } else throw TypeError("One of keys expected: sync, promise, import");

        const plugin = new PluginObject<V>(component, loader);
        Object.assign(plugin, metaRest);
        this.items.push(plugin as Plugin<V, M>);
    }

    seal() {
        this._sealed = true;
        console.debug(
            `Registry '${this.identity}': ` +
                `${this.items.length} plugins registered, ` +
                `${this._skipped} skipped`
        );
    }

    get sealed() {
        return this._sealed;
    }

    get count() {
        return this.items.length;
    }

    get skipped() {
        return this._skipped;
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

    async load(query?: Query<M>): Promise<V> {
        const item = this.queryAll(query)[0];
        if (item === undefined)
            throw new Error(
                `No plugin found for selector: ${JSON.stringify(query)}`
            );
        return await item.load();
    }
}

export function pluginRegistry<
    V extends Value,
    M extends Metadata = NoMetadata,
>(
    identity: string
): Pick<PluginRegistry<V, M>, "register" | "query" | "queryAll" | "load"> {
    return new PluginRegistry<V, M>(identity);
}
