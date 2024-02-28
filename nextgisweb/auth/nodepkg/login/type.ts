export interface Credentials {
    login?: string;
    password?: string;
}

export interface LoginFormProps {
    onChange?: (creds: Credentials | undefined) => void;
    reloadAfterLogin?: boolean;
}

export interface CredsOnChangeOptions {
    value: Credentials;
    isValid: () => Promise<boolean>;
}
