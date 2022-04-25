import { Col, Input, Row } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import ErrorDialog from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { PropTypes } from "prop-types";
import { useEffect, useState } from "react";

export function SingleSettingForm({ model, settingName, inputProps = {} }) {
    const [status, setStatus] = useState("loading");
    const [value, setValue] = useState();

    useEffect(async () => {
        const resp = await route(model).get();
        const val = settingName ? resp[settingName] : resp;
        setValue(val);
        setStatus(null);
    }, []);

    const save = async () => {
        setStatus("saving");
        try {
            const json = settingName
                ? { [settingName]: value || null }
                : value || null;
            await route(model).put({
                json,
            });
        } catch (err) {
            new ErrorDialog(err).show();
        } finally {
            setStatus(null);
        }
    };

    if (status == "loading") {
        return <LoadingWrapper />;
    }

    return (
        <Row>
            <Col flex="auto">
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    {...inputProps}
                />
            </Col>
            <Col flex="none">
                <SaveButton loading={status === "saving"} onClick={save} />
            </Col>
        </Row>
    );
}

SingleSettingForm.propTypes = {
    model: PropTypes.string.isRequired,
    settingName: PropTypes.string,
    inputProps: PropTypes.object,
};
