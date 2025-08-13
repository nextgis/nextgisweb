import type { LoginBody } from "@nextgisweb/auth/type/api";

export interface LoginFormProps {
    onChange?: (creds: LoginBody | undefined) => void;
    reloadAfterLogin?: boolean;
}

export interface CredsOnChangeOptions {
    value: LoginBody;
    isValid: () => Promise<boolean>;
}
