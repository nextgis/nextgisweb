declare module "@nextgisweb/pyramid/i18n" {
    const value: { gettext: (val: string) => string };
    export = value;
}

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
};
