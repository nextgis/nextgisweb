/* eslint-disable no-use-before-define */
import { makeObservable } from "mobx";

import type { ErrorResult, Validator } from "./type";

type ValidateIf<O> = (obj: O) => boolean;
type OnChange<O> = (obj: O) => void;

export interface MapperOpts<O> {
    validateIf?: ValidateIf<O>;
    onChange?: OnChange<O>;
}

const MappedValueSymbol: unique symbol = Symbol("MappedValue");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MappedValue<V = any, O = any, P extends string = string> {
    [MappedValueSymbol] = true;

    private _value: V;
    private readonly owner: O;
    private readonly validators: Validator<V, O>[];

    private readonly validateIf?: ValidateIf<O>;
    private readonly onChange?: OnChange<O>;

    public readonly property: P;

    constructor(value: V, owner: O, prop: MappedProperty<V, O, P>) {
        this._value = value;
        this.owner = owner;
        this.validateIf = prop.validateIf;
        this.onChange = prop.onChange;
        this.property = prop.property;
        this.validators = prop.validators;
        makeObservable<typeof this, "_value">(this, {
            _value: true,
            value: true,
            error: true,
        });
    }

    get value(): V {
        return this._value;
    }

    set value(value: V) {
        this._value = value;
        this.onChange?.(this.owner);
    }

    setter = (value: V): void => {
        this.value = value;
    };

    get error(): ErrorResult {
        if (this.validateIf?.(this.owner) === false) return undefined;

        for (const v of this.validators) {
            const [ok, err] = v(this._value, this.owner);
            if (!ok) return err;
        }
        return false;
    }

    jsonPart(): { [K in P]: V } {
        if (!this.property) throw new TypeError("Property not set!");
        return { [this.property]: this._value } as { [K in P]: V };
    }

    cprops(): {
        value: V;
        onChange: (value: V) => void;
        status?: "error";
    } {
        return {
            value: this._value,
            onChange: this.setter,
            status: this.error ? "error" : undefined,
        };
    }
}

class MappedProperty<V, O, P extends string = string> {
    property: P;
    validators: Validator<V, O>[] = [];
    validateIf?: ValidateIf<O>;
    onChange?: OnChange<O>;

    constructor(property: P, opts: MapperOpts<O>) {
        this.property = property;
        this.validateIf = opts.validateIf;
        this.onChange = opts.onChange;
    }

    validate(...args: Validator<V, O>[]): void {
        this.validators.push(...args);
    }

    init(initial: V, obj: O) {
        return new MappedValue<V, O, P>(initial, obj, this);
    }
}

export function mapper<O, D>(
    opts?: MapperOpts<O>
): {
    [P in keyof D]: P extends string ? MappedProperty<D[P], O, P> : never;
} & {
    $load: (targеt: O, source: Partial<D>) => void;
    $error: (obj: O) => ErrorResult;
} {
    const props: (keyof D)[] = [];

    function* iterMV(obj: object): Generator<[mv: MappedValue, pn: keyof D]> {
        for (const v of Object.values(obj)) {
            if (v?.[MappedValueSymbol]) {
                const mv = v as MappedValue;
                const pn = mv.property as keyof D;
                if (props.includes(pn)) yield [mv, pn];
            }
        }
    }

    const $load = (obj: object, source: Partial<D>) => {
        for (const [mv, pn] of iterMV(obj)) {
            mv.setter(source[pn]);
        }
    };

    const $error = (obj: object): ErrorResult => {
        for (const [mv] of iterMV(obj)) {
            const err = mv.error;
            if (err !== false) return err;
        }
        return false;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy({ $load, $error } as any, {
        get: (target, prop) => {
            if (typeof prop === "string" && !prop.startsWith("$")) {
                props.push(prop as keyof D);
                return new MappedProperty(prop, opts || {});
            } else {
                return target[prop];
            }
        },
    });
}
