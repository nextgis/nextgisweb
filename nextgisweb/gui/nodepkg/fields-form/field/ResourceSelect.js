import PropTypes from "prop-types";

import { useCallback, useEffect, useState, useMemo } from "react";
import ManageSearchIcon from "@material-icons/svg/manage_search";

import { Button, Form, Input, Skeleton } from "@nextgisweb/gui/antd";
import { showResourcePicker } from "@nextgisweb/resource/resource-picker";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useAbortController } from "@nextgisweb/pyramid/hook/useAbortController";

const SelectInput = ({ value, onChange, ...pickerOptions }) => {
    const { makeSignal, abort } = useAbortController();
    const [resource, setResource] = useState(null);
    const [resourceLoading, setResourceLoading] = useState(null);
    const loadResource = useCallback(async () => {
        abort();
        try {
            const res = await route("resource.item", value).get({
                cache: true,
                signal: makeSignal(),
            });
            setResource(res);
        } finally {
            setResourceLoading(false);
        }
    }, [value]);

    useEffect(() => {
        return abort;
    }, []);

    useEffect(() => {
        loadResource();
    }, [value, loadResource]);

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

SelectInput.propTypes = {
    onChange: PropTypes.func,
    value: PropTypes.any,
};

export function ResourceSelect({ pickerOptions, ...props }) {
    return (
        <Form.Item {...props}>
            <SelectInput {...pickerOptions}></SelectInput>
        </Form.Item>
    );
}

ResourceSelect.propTypes = {
    pickerOptions: PropTypes.object,
};
