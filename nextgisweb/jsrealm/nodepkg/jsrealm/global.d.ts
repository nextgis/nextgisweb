/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "@nextgisweb/jsrealm/entrypoint" {
    const value: <T = unknown>(name: string) => Promise<T>;
    export = value;
}

declare module "@nextgisweb/jsrealm/locale-loader!" {
    const value: {
        antd: any;
    };
    export = value;
}

declare type Nullable<T> = { [K in keyof T]: T[K] | null };
