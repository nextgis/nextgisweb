import { Input, Row, Col } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component";
import { route } from "@nextgisweb/pyramid/api";
import ErrorDialog from "ngw-pyramid/ErrorDialog/ErrorDialog";
import { useEffect, useState } from "react";

export function SystemNameForm() {
    const [fullName, setFullName] = useState();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        route("pyramid.system_name")
            .get()
            .then((data) => {
                setFullName(data.full_name);
            });
    }, []);

    const saveSystemName = () => {
        setLoading(true);

        const data = { full_name: fullName };
        route("pyramid.system_name")
            .put({ json: data })
            .then(() => {
                window.location.reload(true);
            })
            .catch((err) => {
                new ErrorDialog(err).show();
            })
            .finally(() => {
                setLoading(false);
            });
    };

    return (
        <Row>
            <Col flex="auto">
                <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />
            </Col>
            <Col flex="none">
                <SaveButton loading={loading} onClick={saveSystemName} />
            </Col>
        </Row>
    );
}
