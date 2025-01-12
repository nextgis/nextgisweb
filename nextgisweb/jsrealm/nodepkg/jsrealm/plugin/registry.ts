import { matches } from "lodash-es";

type Query<M extends NonNullable<unknown>> = ((i: M) => boolean) | Partial<M>;

export class BaseRegistry<
    P extends NonNullable<unknown> = NonNullable<unknown>,
    M extends NonNullable<unknown> = NonNullable<unknown>,
> {
    readonly identity: string;
    protected readonly items = new Array<P>();
    protected _sealed = false;
    protected _skipped = 0;

    constructor(identity: string) {
        this.identity = identity;
    }

    protected _register(component: string, fn: () => P): void {
        if (this._sealed) {
            throw new Error(`Registry '${this.identity}' already sealed`);
        }

        if (!ngwConfig.components.includes(component)) {
            this._skipped += 1;
            return;
        }

        this.items.push(fn());
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
            if (query(itm as unknown as M)) yield itm;
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

export class PluginRegistry<
    P extends NonNullable<unknown>,
> extends BaseRegistry<P, P> {
    /**
     * Register plugin in registry
     *
     * @param component Use {@link COMP_ID} global
     * @param value Plugin value
     *
     * @example
     * registry.register(COMP_ID, {
     *     store: () => import("./Store"),
     *     widget: () => import("./Widget"),
     * })
     */
    register(component: string, value: P): void {
        this._register(component, () => value);
    }
}

/**
 * Construct plugin registry
 *
 * @typeParam P Type of plugin
 *
 * @param identity Use {@link MODULE_NAME} global
 * @returns PluginRegistry instance
 */
export function pluginRegistry<P extends NonNullable<unknown>>(
    identity: string
): PluginRegistry<P> {
    return new PluginRegistry<P>(identity);
}
