import DeleteForeverIcon from "@material-icons/svg/delete_forever";
import ErrorIcon from "@material-icons/svg/error";
import { observer } from "mobx-react-lite";
import {
    Table,
    Tooltip,
    Input,
    InputNumber,
    Select,
    Button,
} from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n";
import "./EditorWidget.less";

const { Column } = Table;
const { Option } = Select;

const KeyError = observer(({ record }) => {
    if (record.error) {
        return (
            <Tooltip title={record.error}>
                <span style={{ color: "var(--error)" }}>
                    <ErrorIcon />
                </span>
            </Tooltip>
        );
    } else {
        return <span />;
    }
});

const InputKey = observer(({ record }) => {
    return (
        <Input
            value={record.key}
            onChange={(e) => {
                const props = { key: e.target.value };
                if (record.value == undefined) {
                    props.value = "";
                }
                record.update(props);
            }}
            suffix={<KeyError record={record} />}
            bordered={false}
            placeholder={
                record.placeholder
                    ? i18n.gettext("Type here to add a new key...")
                    : undefined
            }
        />
    );
});

const InputValue = observer(({ record }) => {
    if (record.type === "string") {
        return (
            <Input
                value={record.value}
                onChange={(e) => {
                    record.update({ value: e.target.value });
                }}
                bordered={false}
            />
        );
    } else if (record.type === "number") {
        return (
            <InputNumber
                value={record.value}
                controls={false}
                onChange={(newValue) => {
                    record.update({ value: newValue });
                }}
                bordered={false}
            />
        );
    } else if (record.type === "boolean") {
        return (
            <Select
                value={record.value}
                onChange={(value) => {
                    record.update({ value: value });
                }}
                bordered={false}
                dropdownMatchSelectWidth={false}
            >
                <Option value={false}>{i18n.gettext("False")}</Option>
                <Option value={true}>{i18n.gettext("True")}</Option>
            </Select>
        );
    }

    return <></>;
});

const SelectType = observer(({ record }) => {
    if (record.placeholder) {
        return <></>;
    }

    return (
        <Select
            value={record.type}
            onChange={(value) => {
                record.update({ type: value });
            }}
            bordered={false}
            dropdownMatchSelectWidth={false}
        >
            <Option value="string">{i18n.gettext("String")}</Option>
            <Option value="number">{i18n.gettext("Number")}</Option>
            <Option value="boolean">{i18n.gettext("Boolean")}</Option>
            <Option value="null">{i18n.gettext("Empty")}</Option>
        </Select>
    );
});

export const EditorWidget = observer(({ store }) => {
    return (
        <Table
            rowKey="id"
            dataSource={store.items.slice()}
            className="ngw-resmeta-editor-widget"
            parentHeight
            size="small"
        >
            <Column
                title={i18n.gettext("Key")}
                dataIndex="key"
                width="50%"
                render={(_, record) => {
                    return <InputKey record={record} />;
                }}
                onCell={(record, _) => ({
                    colSpan: record.placeholder ? 4 : 1,
                })}
            />
            <Column
                title={i18n.gettext("Type")}
                dataIndex="type"
                render={(_, record) => {
                    return <SelectType record={record} />;
                }}
                onCell={(record, _) => ({
                    colSpan: record.placeholder ? 0 : 1,
                })}
            />
            <Column
                title={i18n.gettext("Value")}
                dataIndex="value"
                width="50%"
                render={(_, record) => {
                    return <InputValue record={record} />;
                }}
                onCell={(record, _) => ({
                    colSpan: record.placeholder ? 0 : 1,
                })}
            />
            <Column
                render={(_, record) => {
                    if (!record.placeholder) {
                        return (
                            <Button
                                type="text"
                                shape="circle"
                                icon={<DeleteForeverIcon />}
                                onClick={() => store.delete(record.id)}
                            />
                        );
                    }
                    return <></>;
                }}
                onCell={(record, _) => ({
                    colSpan: record.placeholder ? 0 : 1,
                })}
            />
        </Table>
    );
});

EditorWidget.title = i18n.gettext("Metadata");
EditorWidget.order = 100;
