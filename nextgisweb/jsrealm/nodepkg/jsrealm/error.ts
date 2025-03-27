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
