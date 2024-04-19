/** @testentry react */
import { useState } from "react";

import { Checkbox, Space } from "@nextgisweb/gui/antd";
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
    const propFields: FormField<keyof CodeProps>[] = [
        {
            name: "fold",
            label: "fold",
            valuePropName: "checked",
            formItem: <Checkbox />,
        },
        {
            name: "readOnly",
            label: "readOnly",
            valuePropName: "checked",
            formItem: <Checkbox />,
        },
        {
            name: "lineNumbers",
            label: "lineNumbers",
            valuePropName: "checked",
            formItem: <Checkbox />,
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
