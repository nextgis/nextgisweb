import { SaveOutlined } from "@ant-design/icons";
import { Button, Input } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!";
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
        <>
            <Input.Group compact>
                <Input
                    value={fullName}
                    style={{ width: "calc(100% - 200px)" }}
                    onChange={(e) => setFullName(e.target.value)}
                />
                <Button
                    type="primary"
                    loading={loading}
                    icon={<SaveOutlined />}
                    onClick={saveSystemName}
                >
                    {i18n.gettext("Save")}
                </Button>
            </Input.Group>
        </>
    );
}
