declare module "@nextgisweb/pyramid/type/config" {
    export interface NgwConfig extends NgwConfig {
        resourceFavorite: {
            identity: string;
            resource: { id: number };
            current: number | null;
        } | null;
    }
}

declare module "@nextgisweb/pyramid/settings!resource" {
    import type { ResourceExport } from "@nextgisweb/resource/type/api";

    const value: { resource_export: ResourceExport };
    export = value;
}
