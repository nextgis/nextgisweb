export class LoggedDeferred<T = boolean> {
    private promise: Promise<T>;
    private resolvePromise!: (value: T | PromiseLike<T>) => void;
    private rejectPromise!: (reason?: any) => void;

    constructor(private name: string) {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
        });
    }

    resolve(value: T): void {
        this.resolvePromise(value);
    }

    reject(reason?: any): void {
        this.rejectPromise(reason);
    }

    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected);
    }

    catch<TResult = never>(
        onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
    ): Promise<T | TResult> {
        return this.promise.catch(onrejected);
    }

    finally(onfinally?: (() => void) | null): Promise<T> {
        return this.promise.finally(onfinally);
    }
}
