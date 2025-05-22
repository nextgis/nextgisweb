// eslint-disable-next-line @typescript-eslint/consistent-type-imports
declare const ngwConfig: import("@nextgisweb/pyramid/type/config").NgwConfig;

declare module "@nextgisweb/pyramid/type/config" {
    interface Distribution {
        name: string;
        description: string | null;
        version: string | null;
        date: string | null;
    }

    export interface NgwConfig {
        packages: Record<string, string>;
        components: string[];
        distribution: Distribution | null;
        ngupdateUrl: string | null;
        instanceId: string;
        debug: boolean;
        applicationUrl: string;
        staticUrl: string;
        staticKey: string;
        isAdministrator: boolean;
        isGuest: boolean;
        controlPanel: boolean;
        userId: number;
        userDisplayName: string;
        invitationSession: boolean;
        resourceHome: { id: number } | null;
        locale: string;
        logoutUrl: string;

        headerLogo:
            | { type: "builtin"; content: str }
            | { type: "custom"; ckey: str };

        // Defined by @nextgisweb/jsrealm/i18n/lang
        plurals: [number, { (n: number): number }];
    }
}
