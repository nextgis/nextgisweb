import { useState } from "react";

import {
    Button,
    Col,
    Form,
    Input,
    InputNumber,
    Row,
    Select,
    Space,
    Switch,
    Typography,
} from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import {
    AddressGeocoderOptions,
    DegreeFormatOptions,
    LegendEnabledOptions,
    UnitsAreaOptions,
    UnitsLengthOptions,
} from "./select-options";

import { SaveOutlined, WarningOutlined } from "@ant-design/icons";

const { Title } = Typography;

const INPUT_DEFAULT_WIDTH = { width: "100%" };

export const SettingsForm = ({
    onFinish,
    initialValues,
    srsOptions,
    status,
}) => {
    const [geocoder, setGeocoder] = useState(
        initialValues.address_geocoder || "nominatim"
    );

    const onValuesChange = (changedValues, allValues) => {
        setGeocoder(allValues.address_geocoder);
    };

    return (
        <Form
            name="webmap_settings"
            className="webmap-settings-form"
            initialValues={initialValues}
            onFinish={onFinish}
            onValuesChange={onValuesChange}
            layout="vertical"
        >
            <Title level={4}>{gettext("General")}</Title>

            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Form.Item>
                        <Space direction="horizontal">
                            <Form.Item
                                noStyle
                                name="hide_nav_menu"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            {gettext("Hide navigation menu for guest")}
                        </Space>
                    </Form.Item>
                </Col>
                <Col span={8}></Col>
                <Col span={8}></Col>
            </Row>

            <Title level={4}>{gettext("Identify popup")}</Title>

            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Form.Item
                        name="popup_width"
                        label={gettext("Width, px")}
                        rules={[
                            {
                                required: true,
                            },
                        ]}
                    >
                        <InputNumber min="100" style={INPUT_DEFAULT_WIDTH} />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item
                        name="popup_height"
                        label={gettext("Height, px")}
                        rules={[
                            {
                                required: true,
                            },
                        ]}
                    >
                        <InputNumber min="100" style={INPUT_DEFAULT_WIDTH} />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item
                        name="identify_radius"
                        label={gettext("Radius, px")}
                        rules={[
                            {
                                required: true,
                            },
                        ]}
                    >
                        <InputNumber min="1" style={INPUT_DEFAULT_WIDTH} />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Form.Item>
                        <Space direction="horizontal">
                            <Form.Item
                                noStyle
                                name="identify_attributes"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            {gettext("Show feature attributes")}
                        </Space>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item>
                        <Space direction="horizontal">
                            <Form.Item
                                noStyle
                                name="show_geometry_info"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            {gettext("Show geometry info")}
                        </Space>
                    </Form.Item>
                </Col>
            </Row>

            <Title level={4}>{gettext("Measurement")}</Title>

            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Form.Item
                        name="units_length"
                        label={gettext("Length units")}
                    >
                        <Select
                            options={UnitsLengthOptions}
                            style={INPUT_DEFAULT_WIDTH}
                        />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="units_area" label={gettext("Area units")}>
                        <Select
                            options={UnitsAreaOptions}
                            style={INPUT_DEFAULT_WIDTH}
                        />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item
                        name="degree_format"
                        label={gettext("Degree format")}
                    >
                        <Select
                            options={DegreeFormatOptions}
                            style={INPUT_DEFAULT_WIDTH}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Form.Item
                        name="measurement_srid"
                        label={gettext("Measurement SRID")}
                    >
                        <Select
                            options={srsOptions}
                            style={INPUT_DEFAULT_WIDTH}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Title level={4}>{gettext("Address search")}</Title>

            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Form.Item>
                        <Space direction="horizontal">
                            <Form.Item
                                noStyle
                                name="address_search_enabled"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            {gettext("Enable")}
                        </Space>
                    </Form.Item>
                </Col>
                <Col span={16}>
                    <Form.Item>
                        <Space direction="horizontal">
                            <Form.Item
                                noStyle
                                name="address_search_extent"
                                valuePropName="checked"
                            >
                                <Switch />
                            </Form.Item>
                            {gettext("Limit by web map initial extent")}
                        </Space>
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Form.Item
                        name="address_geocoder"
                        label={gettext("Provider")}
                    >
                        <Select
                            options={AddressGeocoderOptions}
                            style={INPUT_DEFAULT_WIDTH}
                        />
                    </Form.Item>
                </Col>
                <Col span={16}>
                    {geocoder === "nominatim" ? (
                        <Form.Item
                            name="nominatim_countrycodes"
                            label={gettext("Limit search results to countries")}
                            rules={[
                                {
                                    pattern: new RegExp(
                                        /^(?:(?:[A-Za-z]+)(?:-[A-Za-z]+)?(?:,|$))+(?<!,)$/
                                    ),
                                    message: (
                                        <div>
                                            {gettext(
                                                "Invalid countries. For example ru or gb,de"
                                            )}
                                        </div>
                                    ),
                                },
                            ]}
                        >
                            <Input style={INPUT_DEFAULT_WIDTH} />
                        </Form.Item>
                    ) : (
                        <Form.Item
                            name="yandex_api_geocoder_key"
                            label={gettext("Yandex.Maps API Geocoder Key")}
                        >
                            <Input style={INPUT_DEFAULT_WIDTH} />
                        </Form.Item>
                    )}
                </Col>
            </Row>

            <Title level={4}>{gettext("Legend")}</Title>

            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Form.Item
                        name="legend_symbols"
                        normalize={(val) => (val === "default" ? null : val)}
                        getValueProps={(val) => {
                            val = !val ? "default" : val;
                            return { value: val };
                        }}
                        label={gettext("Visibility")}
                    >
                        <Select
                            options={LegendEnabledOptions}
                            style={INPUT_DEFAULT_WIDTH}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row className="row-submit">
                <Col>
                    <Button
                        htmlType="submit"
                        type={"primary"}
                        danger={status === "saved-error"}
                        icon={
                            status === "saved-error" ? (
                                <WarningOutlined />
                            ) : (
                                <SaveOutlined />
                            )
                        }
                        loading={status === "saving"}
                    >
                        {gettext("Save")}
                    </Button>
                </Col>
            </Row>
        </Form>
    );
};
