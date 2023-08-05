/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "@material-icons/svg/*" {
    const value: any;
    export = value;
}

declare module "@nextgisweb/jsrealm/entrypoint" {
    const value: <T = unknown>(name: string) => Promise<T>;
    export = value;
}
