import matches from "lodash-es/matches";
import omit from "lodash-es/omit";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RegisterValue = any;

type Loader<V> = () => Promise<V>;

type ImportLoader<V extends RegisterValue> = () => Promise<{
    default: V;
}>;

class PluginBase<V> {
    readonly component: string;
    private readonly loader: Loader<V>;

    private promise?: Promise<V> = undefined;
    private value?: V = undefined;

    constructor(component: string, loader: Loader<V>) {
        this.component = component;
        this.loader = loader;
    }

    async load(): Promise<V> {
        if (this.value !== undefined) return this.value;
        if (this.promise === undefined) this.promise = this.loader();
        this.value = await this.promise;
        return this.value;
    }
}

type Plugin<V, M> = PluginBase<V> & M;

type Selector<M> = { component?: string } & M;

type RegisterParams<V extends RegisterValue, M> = { component: string } & M &
    ({ value: V } | { loader: Loader<V> } | { import: ImportLoader<V> });

interface QueryParams<M> {
    selector?: Selector<M>;
    filter?: (selector: Selector<M>) => boolean;
}

export class PluginRegistry<V extends RegisterValue, M> {
    readonly identity: string;
    protected readonly items: Plugin<V, M>[];
    protected _sealed: boolean = false;
    protected _skipped: number = 0;

    constructor(identity: string) {
        this.identity = identity;
        this.items = [];
    }

    register({ component, ...rest }: RegisterParams<V, M>) {
        if (this._sealed)
            throw new Error(`Registry '${this.identity}' already sealed`);

        if (!ngwConfig.components.includes(component)) {
            this._skipped += 1;
            return;
        }

        let loader: Loader<V> | undefined = undefined;

        const lerr = "Exactly one of keys expected: import, promise or sync";
        const assertLoaderNotSet = () => {
            if (loader !== undefined) throw new Error(lerr);
        };

        if ("loader" in rest) {
            assertLoaderNotSet();
            loader = rest.loader;
        } else if ("value" in rest) {
            assertLoaderNotSet();
            const _value = rest.value;
            loader = () => new Promise((resolve) => resolve(_value));
        } else if ("import" in rest) {
            assertLoaderNotSet();
            const _import = rest.import;
            loader = () =>
                new Promise((resolve) => {
                    _import().then((mod) => {
                        resolve(mod.default);
                    });
                });
        } else if (loader === undefined) {
            throw new Error(lerr);
        }

        const plugin = new PluginBase<V>(component, loader);
        Object.assign(plugin, omit(rest, ["loader", "value", "import"]));
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

    *query({ selector, filter }: QueryParams<M> = {}) {
        if (!this._sealed)
            throw new Error(`Registry '${this.identity}' hasn't been sealed`);

        const pselector = selector ? matches(selector) : () => true;
        const pfilter = filter ? filter : () => true;
        for (const itm of this.items) {
            if (pselector(itm) && pfilter(itm)) yield itm;
        }
    }

    async load(selector: Selector<M>): Promise<V> {
        const item = Array.from(this.query({ selector }))[0];
        if (item === undefined)
            throw new Error(
                `Plugin not found for selector: ${JSON.stringify(selector)}`
            );
        return await item.load();
    }
}
