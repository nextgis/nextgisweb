interface InjectionEntry {
  args: readonly unknown[];
  value: unknown;
}

export class InjectionContainer {
  private readonly entries = new Map<
    (...args: never[]) => unknown,
    InjectionEntry
  >();

  get<Args extends unknown[], T>(
    factory: (...args: Args) => T,
    ...args: NoInfer<Args>
  ): T {
    const entry = this.entries.get(factory);
    if (entry) {
      if (
        entry.args.length !== args.length ||
        entry.args.some((arg, index) => !Object.is(arg, args[index]))
      ) {
        throw new Error(
          `Injection '${factory.name || "anonymous"}' was requested with different arguments. Use a separate InjectionProvider.`
        );
      }
      return entry.value as T;
    }

    const value = factory(...args);
    this.entries.set(factory, { args, value });
    return value;
  }
}
