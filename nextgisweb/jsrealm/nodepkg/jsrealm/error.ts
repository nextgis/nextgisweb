/**
 * Base class for errors that preserve name
 *
 * @example
 * class CustomError extends BaseError {}
 * const err = new CustomError();
 * assert(err.name === "CustomErrror");
 */
export class BaseError<O extends ErrorOptions = ErrorOptions> extends Error {
    constructor(message?: string, options?: O) {
        super(message, options?.cause ? { cause: options?.cause } : {});
        this.name = this.constructor.name;
    }
}

export class AssertionError extends BaseError {}

/**
 * Throw {@link AssertionError} if {@link condition} is falsy
 *
 * Acts as a TypeScript assertion function (`asserts condition`) to narrow types
 * after checks.
 *
 * @param condition Condition to check
 * @param message Optional error message
 * @throws {AssertionError} If condition is falsy
 *
 * @example
 * const value: string | undefined = foo();
 * assert(value, "Value required");
 * // Input is now typed as string
 * console.log(value.toUpperCase());
 */
export function assert(
    condition: unknown,
    message: string = "Assertion failed"
): asserts condition {
    if (!condition) {
        throw new AssertionError(message);
    }
}
