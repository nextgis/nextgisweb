declare const ngwConfig: {
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
