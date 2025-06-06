import { observer } from "mobx-react-lite";
import { useEffect } from "react";

import { LoginBox } from "../login";
import type { LoginFormProps } from "../login/type";
import { authStore } from "../store";

export const LoginPage = observer((props: LoginFormProps) => {
    useEffect(() => {
        // Do not show new modal on "Sign in" click
        authStore.setShowLoginModal(false);
    }, []);
    return (
        <div
            className="ngw-pyramid-layout-crow"
            style={{
                justifyContent: "center",
                alignItems: "center",
                padding: "24px",
                backgroundColor: "#fafafa",
            }}
        >
            <LoginBox {...props} />
        </div>
    );
});

LoginPage.displayName = "LoginPage";
