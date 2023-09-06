declare const ngwConfig: {
    components: string[];
    debug: boolean;
    applicationUrl: string;
    staticUrl: string;
    staticKey: string;
    isAdministrator: boolean;
    isGuest: boolean;
    userId: number;
    userDisplayName: string;
    invitationSession: boolean;
    locale: string;
    // Defined in @nextgisweb/jsrealm/locale-loader
    plurals: [number, { (n: number): number }];
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

declare module "@nextgisweb/pyramid/api/load!/api/component/pyramid/route" {
    const value: Record<string, string[]>;
    export = value;
}
