import { observer } from "mobx-react-lite";

import LoginForm from "../login-form";

export const LoginBox = observer((props) => {
    return (
        <div className="ngw-card" style={{ width: "350px", padding: "12px" }}>
            <LoginForm {...props} />
        </div>
    );
});
