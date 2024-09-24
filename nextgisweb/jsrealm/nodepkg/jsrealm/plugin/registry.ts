import { matches } from "lodash-es";

type Value = NonNullable<unknown>;
type Metadata = NonNullable<unknown>;

interface NoMetadata {}

type PromiseLoader<V extends Value> = () => Promise<V>;
type ImportLoader<V extends Value> = PromiseLoader<{ default: V }>;

class PluginObject<V extends Value, M extends Metadata> {
    readonly component: string;
    readonly #loader: PromiseLoader<V>;

    #promise?: Promise<V>;
    #value?: V;

    constructor(component: string, loader: PromiseLoader<V>, meta?: M) {
        this.component = component;
        this.#loader = loader;
        Object.assign(this, meta);
    }

    async load(): Promise<V> {
        if (this.#value !== undefined) return this.#value;
        if (this.#promise === undefined) this.#promise = this.#loader();
        this.#value = await this.#promise;
        return this.#value;
    }
}

type Plugin<V extends Value, M extends Metadata> = PluginObject<V, M> &
    Readonly<M>;

type RegisterValue<V extends Value> = V | PromiseLoader<V> | ImportLoader<V>;

type Selector<M> = { component: string } & M;

type Query<M extends Metadata> =
    | ((i: Selector<M>) => boolean)
    | Partial<Selector<M>>;

function isAsyncLoader<V extends Value = Value>(
    fn: unknown
): fn is ImportLoader<V> | PromiseLoader<V> {
    return typeof fn === "function" && fn().then instanceof Function;
}

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

    register(component: string, value: RegisterValue<V>, meta?: M): void {
        if (this._sealed)
            throw new Error(`Registry '${this.identity}' already sealed`);

        if (!ngwConfig.components.includes(component)) {
            this._skipped += 1;
            return;
        }

        let loader: PromiseLoader<V>;

        if (isAsyncLoader(value)) {
            loader = () =>
                value().then((mod) => {
                    if (mod && typeof mod === "object" && "default" in mod) {
                        return mod.default;
                    }
                    return mod;
                });
        } else {
            loader = () => Promise.resolve(value);
        }

        const plugin = new PluginObject<V, M>(component, loader, meta);

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

    load(query?: Query<M>): Promise<V> {
        const item = this.queryAll(query)[0];
        if (item === undefined)
            throw new Error(
                `No plugin found for selector: ${JSON.stringify(query)}`
            );
        return item.load();
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
