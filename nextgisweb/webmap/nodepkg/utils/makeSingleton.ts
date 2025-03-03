export function makeSingleton<T extends new (...args: any[]) => any>(ctor: T) {
    let instance: InstanceType<T> | null = null;

    const singletonCtor = {
        getInstance: (args?: ConstructorParameters<T>): InstanceType<T> => {
            if (!instance) {
                instance = new ctor(...(args || []));
                Object.defineProperty(instance, "constructor", {
                    value: null,
                    writable: false,
                });
            }
            return instance as InstanceType<T>;
        },
    };

    return singletonCtor;
}
