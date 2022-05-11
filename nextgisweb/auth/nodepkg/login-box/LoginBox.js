import { ContentBox } from "@nextgisweb/gui/component";
import { observer } from "mobx-react-lite";
import LoginForm from "../login-form";

export const LoginBox = observer((props) => {
    return (
        <ContentBox style={{ width: "350px" }}>
            <LoginForm {...props} />
        </ContentBox>
    );
});
