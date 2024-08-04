import isEqual from "lodash-es/isEqual";
import { action, computed, observable, runInAction, toJS } from "mobx";
import type { InputHTMLAttributes } from "react";

import type { ErrorResult, Validator } from "./type";
import * as validate from "./validate";

type ValidateIf<O> = (obj: O) => boolean;
type OnChange<O> = (obj: O) => void;

interface FieldProps {
    type?: "string" | "number";
    required?: boolean;
}

interface NumberFieldProps {
    min?: number;
    max?: number;
}

interface StringFieldProps {
    maxLength?: number;
    minLength?: number;
    url?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtraProps = Record<string, any>;
type ValidationProps<V> = FieldProps &
    (V extends number
        ? NumberFieldProps
        : V extends string
          ? StringFieldProps
          : FieldProps);

export type MapperOpts<O> = {
    validateIf?: ValidateIf<O>;
    onChange?: OnChange<O>;
};

const MappedValueSymbol: unique symbol = Symbol("MappedValue");

export type CProps<V, E = ExtraProps> = {
    value?: V;
    onChange?: OnChange<V>;
    status?: "error";
    extraProps?: E;
} & Pick<InputHTMLAttributes<V>, "min" | "max" | "minLength" | "maxLength">;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MappedValue<V = any, O = any, P extends string = string> {
    [MappedValueSymbol] = true;

    private readonly owner: O;
    @observable private accessor _value: V;
    readonly prop: MappedProperty<V, O, P>;
    private initialValue: V;

    constructor(value: V, owner: O, prop: MappedProperty<V, O, P>) {
        this._value = value;
        this.initialValue = toJS(value);
        this.owner = owner;
        this.prop = prop;
    }

    @computed get value(): V {
        return this._value;
    }

    set value(value: V) {
        runInAction(() => {
            this._value = value;
        });
        this.prop.onChange?.(this.owner);
    }

    /**
     * A regular updates method where the initial state should remain unchanged.
     */
    @action setter = (value: V): void => {
        this.value = value;
    };

    /**
     * Initializes the property value and sets the initial value for dirty calculation.
     */
    @action load = (value: V): void => {
        this.initialValue = value;
        this.setter(value);
    };

    @computed get error(): ErrorResult {
        if (this.prop.validateIf?.(this.owner) === false) {
            return undefined;
        }

        for (const v of this.prop.validators) {
            const [ok, err] = v(this._value, this.owner);
            if (!ok) return err;
        }
        return false;
    }

    @computed get dirty(): boolean {
        return !isEqual(toJS(this._value), this.initialValue);
    }

    jsonPart(): { [K in P]: V } {
        if (!this.prop.property) throw new TypeError("Property not set!");
        return { [this.prop.property]: this._value } as { [K in P]: V };
    }

    cprops(): CProps<V> {
        const { max, maxLength, min, minLength } = this.prop
            .validationProps as StringFieldProps & NumberFieldProps;
        const cprops: CProps<V> = {
            value: this._value,
            onChange: this.setter,
            status: this.error ? "error" : undefined,
            // HTML validation props
            ...(min !== undefined ? { min } : {}),
            ...(max !== undefined ? { max } : {}),
            ...(minLength !== undefined ? { minLength } : {}),
            ...(maxLength !== undefined ? { maxLength } : {}),
        };
        if (this.prop.extraProps) {
            cprops.extraProps = this.prop.extraProps;
        }
        return cprops;
    }
}
class MappedProperty<V, O, P extends string = string> {
    property: P;
    readonly validators: Validator<V, O>[] = [];
    validateIf?: ValidateIf<O>;
    onChange?: OnChange<O>;
    readonly validationProps = {} as ValidationProps<V>;
    readonly extraProps?: ExtraProps;

    constructor(property: P, opts: FieldOpts<V, O> & MapperOpts<O>) {
        this.property = property;
        const {
            validateIf,
            onChange,
            validators,
            extraProps,
            ...validationProps
        } = opts;
        this.validateIf = validateIf;
        this.onChange = onChange;
        let newValidators: Validator<V, O>[] = [];
        this.validationProps = validationProps as ValidationProps<V>;
        this.extraProps = extraProps;

        if (validationProps.required) {
            newValidators.push(validate.required());
        }

        if ("min" in validationProps || "max" in validationProps) {
            const { min, max } = validationProps as NumberFieldProps;
            newValidators.push(validate.number({ min, max }));
        }

        if (
            "maxLength" in validationProps ||
            "minLength" in validationProps ||
            "url" in validationProps
        ) {
            const { maxLength, minLength, url } =
                validationProps as StringFieldProps;
            newValidators.push(validate.string({ maxLength, minLength, url }));
        }

        if (validators) {
            newValidators = [...newValidators, ...validators];
        }

        if (newValidators.length) {
            this.validate(...newValidators);
        }
    }

    validate(...args: Validator<V, O>[]): void {
        this.validators.push(...args);
    }

    init(initial: V, obj: O) {
        return new MappedValue<V, O, P>(initial, obj, this);
    }
}

export type FieldOpts<V, O, E = ExtraProps> = ValidationProps<V> & {
    validators?: Validator<V, O>[];
    extraProps?: E;
};

export type MapperResult<O, D> = {
    [P in keyof D]-?: P extends string ? MappedProperty<D[P], O, P> : never;
} & {
    $load: (target: O, source: Partial<D>) => void;
    $error: (obj: O) => ErrorResult;
    $dump: (obj: O) => Partial<D>;
    $dirty: (obj: O) => boolean;
};

export function mapper<O, D>(
    opts?: {
        properties?: {
            [P in keyof D]?: P extends string ? FieldOpts<D[P], O> : never;
        };
    } & MapperOpts<O>
): MapperResult<O, D> {
    const props: (keyof D)[] = [];

    function* iterMV(obj: object): Generator<[mv: MappedValue, pn: keyof D]> {
        for (const v of Object.values(obj)) {
            if (v?.[MappedValueSymbol]) {
                const mv = v as MappedValue;
                const pn = mv.prop.property as keyof D;
                if (props.includes(pn)) yield [mv, pn];
            }
        }
    }

    const $load = (obj: object, source: Partial<D>) => {
        for (const [mv, pn] of iterMV(obj)) {
            if (pn in source) {
                mv.load(source[pn]);
            }
        }
    };

    const $dump = (obj: object): Partial<D> => {
        const result: Partial<D> = {};
        for (const [mv, pn] of iterMV(obj)) {
            result[pn] = toJS(mv.value);
        }
        return result;
    };

    const $dirty = (obj: object): boolean => {
        for (const [mv] of iterMV(obj)) {
            if (mv.dirty) {
                return true;
            }
        }
        return false;
    };

    const $error = (obj: object): ErrorResult => {
        for (const [mv] of iterMV(obj)) {
            const err = mv.error;

            if (err !== false) return err;
        }
        return false;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy({ $load, $error, $dump, $dirty } as any, {
        get: (target, prop) => {
            if (typeof prop === "string" && !prop.startsWith("$")) {
                props.push(prop as keyof D);
                const { properties, ...mappedOpts } = opts ?? {};
                const fieldProps =
                    properties && properties[prop as keyof typeof properties];
                if (fieldProps) {
                    Object.assign(mappedOpts, fieldProps);
                }
                return new MappedProperty(prop, mappedOpts);
            } else {
                return target[prop];
            }
        },
    });
}
