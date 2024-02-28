import { LoginForm } from "./LoginForm";
import type { LoginFormProps } from "./type";

export function LoginBox(props: LoginFormProps) {
    return (
        <div className="ngw-card" style={{ width: "350px", padding: "12px" }}>
            <LoginForm {...props} />
        </div>
    );
}
