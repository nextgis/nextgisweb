import ManageSearchIcon from "@material-icons/svg/manage_search";
import { Button, Form, Input, Skeleton } from "@nextgisweb/gui/antd";
import { showResourcePicker } from "@nextgisweb/resource/resource-picker";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useCallback, useEffect, useState, useMemo } from "react";

let abortController = null;

const SelectInput = ({ value, onChange, ...pickerOptions }) => {
    const [resource, setResource] = useState(null);
    const [resourceLoading, setResourceLoading] = useState(null);
    const loadResource = useCallback(async () => {
        abort();
        abortController = new AbortController();
        setResourceLoading(true);
        try {
            const res = await route("resource.item", value).get({
                cache: true,
                signal: abortController.signal,
            });
            setResource(res);
        } finally {
            setResourceLoading(false);
        }
    }, [value]);

    const abort = () => {
        if (abortController) {
            abortController.abort();
        }
        abortController = null;
    };

    useEffect(() => {
        return abort;
    }, []);
    useEffect(() => {
        loadResource();
    }, [value]);

    const displayName = useMemo(() => {
        return resource && resource.resource.display_name;
    }, [resource]);

    const onClick = () => {
        const resourceId = value;
        showResourcePicker({
            ...pickerOptions,
            resourceId: resourceId ? Number(resourceId) : 0,
            onSelect: onChange,
        });
    };

    return (
        <Input.Group compact>
            <div
                className="ant-col ant-form-item-control"
                style={{ width: "calc(100% - 32px)" }}
            >
                <div className="ant-form-item-control-input">
                    <div className="ant-form-item-control-input-content">
                        <div className="ant-input" onClick={onClick}>
                            {resourceLoading ? (
                                <Skeleton.Button active size="small" />
                            ) : (
                                <a
                                    href={routeURL("resource.show", value)}
                                    onClick={(evt) => evt.stopPropagation()}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {displayName}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Button onClick={onClick} icon={<ManageSearchIcon />} />
        </Input.Group>
    );
};

export function ResourceSelect({ form, pickerOptions, ...props }) {
    return (
        <Form.Item {...props}>
            <SelectInput {...pickerOptions}></SelectInput>
        </Form.Item>
    );
}
