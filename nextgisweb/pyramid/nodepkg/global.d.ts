declare const ngwConfig: {
    components: string[];
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
    locale: string;
    logoutUrl: string;
    // Defined in @nextgisweb/jsrealm/locale-loader
    plurals: [number, { (n: number): number }];
};

declare const dojoConfig: {
    baseUrl: string;
    isDebug: boolean;
    locale: string;
};

declare module "@nextgisweb/pyramid/settings!pyramid" {
    interface Language {
        display_name: string;
        value: string;
    }

    interface Companylogo {
        enabled: boolean;
        ckey: string;
        link?: string;
    }

    interface PyramidSettings {
        _esModule: boolean;
        support_url?: string;
        help_page_url?: string;
        company_logo: Companylogo;
        languages: Language[];
        language_contribute_url?: string;
        storage_enabled: boolean;
        storage_limit?: number;
        lunkwill_enabled: boolean;
    }
    const value: PyramidSettings;
    export = value;
}
