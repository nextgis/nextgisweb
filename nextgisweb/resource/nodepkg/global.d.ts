declare module "@nextgisweb/pyramid/settings!resource" {
    const value: {
        resource_export: "administrators" | "data_read" | "data_write";
    };

    export = value;
}

declare module "@nextgisweb/pyramid/api/load!/api/component/resource/blueprint" {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const value: import("./type/Blueprint").Blueprint;

    export = value;
}
