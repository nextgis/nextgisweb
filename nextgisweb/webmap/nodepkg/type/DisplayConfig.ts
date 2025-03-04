export type Entrypoint =
    | string
    | [midKey: string, loader: () => Promise<{ default: any }>];
export interface Mid {
    adapter: Entrypoint[];
    plugin: Entrypoint[];
}
