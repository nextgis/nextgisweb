declare module "@nextgisweb/pyramid/type/config" {
    export interface NgwConfig extends NgwConfig {
        resourceFavorite: {
            identity: string;
            resource: { id: number };
            current: number | null;
        } | null;
    }
}
