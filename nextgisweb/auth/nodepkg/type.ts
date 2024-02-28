export interface User {
    id: number;
    system: boolean;
    display_name: string;
    keyname: string;
    disabled: boolean;
    password: boolean;
    last_activity?: string;
    oauth_subject?: string;
    is_administrator: boolean;
}

export interface Group {
    id: number;
    system: boolean;
    keyname: string;
    display_name: string;
    description?: string;
    register: boolean;
    oauth_mapping: boolean;
    members: number[];
}
