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

interface Exportformat {
    name: string;
    display_name: string;
    single_file: boolean;
    lco_configurable?: boolean | null;
    dsco_configurable?: boolean | null;
}

interface Editorwidget {
    description: string;
    attachment: string;
}

interface EditorWidgetSettings {
    editor_widget: Editorwidget;
    extensions: Editorwidget;
    export_formats: Exportformat[];
    datatypes: string[];
}

declare module "@nextgisweb/pyramid/settings!" {
    const value: EditorWidgetSettings;
    export = value;
}
declare module "@nextgisweb/pyramid/settings!pyramid" {
    const value: {
        language_contribute_url: string;
        languages: { value: string; display_name: string }[];
    };
    export = value;
}
