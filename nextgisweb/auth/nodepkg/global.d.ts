declare module "@nextgisweb/pyramid/settings!auth" {
    interface OAuth {
        base_url: string;
        bind: boolean;
        default: boolean;
        display_name: string;
        enabled: boolean;
        group_mapping: boolean;
        server_type: string;
    }

    interface AuthSettings {
        alink: boolean;
        oauth: OAuth;
    }
    const value: AuthSettings;
    export = value;
}
