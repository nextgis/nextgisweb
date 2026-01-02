import { fetchSettings } from "@nextgisweb/pyramid/settings";

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
    logoMaxSize: number;
    safe_url_pattern: string;
    support_url?: string;
    help_page_url?: string;
    company_logo: Companylogo;
    languages: Language[];
    language_contribute_url?: string;
    storage_enabled: boolean;
    storage_limit?: number;
    lunkwill_enabled: boolean;
    lunkwill_hmux: boolean;
}

export default await fetchSettings<PyramidSettings>(COMP_ID);
