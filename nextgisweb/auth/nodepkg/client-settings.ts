import { fetchSettings } from "@nextgisweb/pyramid/settings";

interface OAuth {
    base_url: string;
    bind: boolean;
    default: boolean;
    display_name: string;
    enabled: boolean;
    group_mapping: boolean;
    server_type: string;
}

export interface AuthSettings {
    alink: boolean;
    oauth: OAuth;
}

export default await fetchSettings<AuthSettings>(COMP_ID);
