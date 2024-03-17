/** @testentry react */
import { useState } from "react";

import { Space } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";

import { FieldsForm } from "../../fields-form";
import type { FormField } from "../../fields-form";

import { Code } from "./Code";
import type { CodeProps } from "./Code";

function CodeTest() {
    const { data: blueprint } = useRouteGet("resource.blueprint");
    const [props, setProps] = useState<CodeProps>({
        lang: "json",
        readOnly: true,
    });
    const propFields: FormField[] = [
        {
            name: "fold",
            label: "fold",
            widget: "checkbox",
        },
        {
            name: "readOnly",
            label: "readOnly",
            widget: "checkbox",
        },
        {
            name: "lineNumbers",
            label: "lineNumbers",
            widget: "checkbox",
        },
    ];

    if (!blueprint) {
        return <>Loading...</>;
    }

    return (
        <Space direction="vertical">
            <FieldsForm
                layout="inline"
                labelCol={{ span: 16 }}
                fields={propFields}
                initialValues={props}
                onChange={async ({ isValid, value }) => {
                    const valid = await isValid();
                    if (valid) {
                        setProps((old) => ({ ...old, ...value }));
                    }
                }}
                style={{ maxWidth: "none" }}
            />
            <Code {...props} value={JSON.stringify(blueprint, null, 4)} />
        </Space>
    );
}

export default CodeTest;
