declare module "@nextgisweb/pyramid/settings!resource" {
    import type { ResourceExport } from "@nextgisweb/resource/type/api";

    const value: { resource_export: ResourceExport };
    export = value;
}

declare module "@nextgisweb/pyramid/api/load!/api/component/resource/blueprint" {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const value: import("@nextgisweb/resource/type/api").Blueprint;

    export = value;
}
