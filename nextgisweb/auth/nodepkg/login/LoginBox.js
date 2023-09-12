import { LoginForm } from "./LoginForm";

export function LoginBox(props) {
    return (
        <div className="ngw-card" style={{ width: "350px", padding: "12px" }}>
            <LoginForm {...props} />
        </div>
    );
}
