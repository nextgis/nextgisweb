import { ContentCard } from "@nextgisweb/gui/component";

import { LoginForm } from "./LoginForm";
import type { LoginFormProps } from "./type";

export function LoginBox(props: LoginFormProps) {
    return (
        <ContentCard style={{ width: "350px" }}>
            <LoginForm {...props} />
        </ContentCard>
    );
}
