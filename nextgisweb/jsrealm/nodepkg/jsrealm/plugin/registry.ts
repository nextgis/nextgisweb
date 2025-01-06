import { matches } from "lodash-es";
import { action, observable } from "mobx";

type Value = NonNullable<unknown>;
type Metadata = NonNullable<unknown>;

interface NoMetadata {}

type PromiseLoader<V extends Value> = () => Promise<V>;
type ImportLoader<V extends Value> = PromiseLoader<{ default: V }>;

export class PluginObject<V extends Value, M extends Metadata> {
    @observable accessor value: V | null = null;
    @observable.shallow accessor meta = {} as M;

    readonly component: string;
    private readonly loader: PromiseLoader<V>;

    private promise?: Promise<V>;

    constructor(component: string, loader: PromiseLoader<V>, meta?: M) {
        this.component = component;
        this.loader = loader;

        if (meta) {
            this.setMeta(meta);
        }
        /**
         * @deprecated This approach is neither reactive nor type-safe.
         * Use reactivity {@link PluginObject.meta } property instead.
         */
        Object.assign(this, meta);
    }

    @action
    setValue(value: V) {
        this.value = value;
    }

    @action
    setMeta(meta: M) {
        this.meta = meta;
    }
    @action
    updateMeta(meta: Partial<M>) {
        this.meta = { ...this.meta, ...meta };
    }

    load = async (): Promise<V> => {
        if (this.value !== null) return this.value;
        if (this.promise === undefined) this.promise = this.loader();
        const value = await this.promise;
        this.setValue(value);
        return value;
    };
}

export type Plugin<V extends Value, M extends Metadata> = PluginObject<V, M> &
    Readonly<M>;

export type RegisterValue<V extends Value> =
    | V
    | PromiseLoader<V>
    | ImportLoader<V>;

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
    @observable.shallow accessor plugins: Plugin<V, M>[] = [];

    readonly identity: string;
    protected _sealed = false;
    protected _skipped = 0;

    constructor(identity: string) {
        this.identity = identity;
    }

    @action
    register(
        component: string,
        value: RegisterValue<V>,
        meta?: M
    ): PluginObject<V, M> | undefined {
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

        this.plugins = [...this.plugins, plugin as Plugin<V, M>];
        return plugin;
    }

    seal() {
        this._sealed = true;
        console.debug(
            `Registry '${this.identity}': ` +
                `${this.plugins.length} plugins registered, ` +
                `${this._skipped} skipped`
        );
    }

    get sealed() {
        return this._sealed;
    }

    get count() {
        return this.plugins.length;
    }

    get skipped() {
        return this._skipped;
    }

    *query(query?: Query<M>) {
        if (!this._sealed)
            throw new Error(`Registry '${this.identity}' hasn't been sealed`);

        if (query === undefined) query = () => true;
        else if (typeof query !== "function") query = matches(query);

        for (const itm of this.plugins) {
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
): Pick<
    PluginRegistry<V, M>,
    "register" | "query" | "queryAll" | "load" | "plugins"
> {
    return new PluginRegistry<V, M>(identity);
}
