export type Validator<V, C = unknown> = (
    value: V,
    context: C
) => [true, undefined] | [false, string];

export type ErrorResult = string | true | false | undefined;
