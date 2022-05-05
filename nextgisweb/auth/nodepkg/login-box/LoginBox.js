import { ContentBox } from "@nextgisweb/gui/component";
import { observer } from "mobx-react-lite";
import LoginForm from "../login-form";

export const LoginBox = observer(() => {
    return (
        <ContentBox style={{ width: "350px" }}>
            <LoginForm />
        </ContentBox>
    );
});
