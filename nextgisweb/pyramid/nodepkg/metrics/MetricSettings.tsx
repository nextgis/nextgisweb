import { useEffect, useMemo, useState } from "react";
import { Balancer } from "react-wrap-balancer";

import { Button, Card, Dropdown, Tabs, message } from "@nextgisweb/gui/antd";
import { SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";

import { route } from "../api";
import { gettext } from "../i18n";
import { PageTitle } from "../layout";
import { registry } from "./tab";

import type { ApiError } from "@nextgisweb/gui/error/type";
import type {
    MetricSettingsTab,
    PyramidMetrics,
    PyramidMetricsComponent,
    PyramidMetricsKey,
} from "./type";

import "./MetricSettings.less";

const msgAdd = gettext("Add");
const msgSuccess = gettext("The setting is saved.");
const msgSuccessReload = gettext("Reload the page to get them applied.");

// prettier-ignore
const msgInfo = [
    gettext("Add one or more counters to your Web GIS."),
    gettext("HTML code of these counters will be embeded into each page and will allow you to track user activity."),
];

const PlaceholderCard = () => (
    <Card size="small">
        <Balancer ratio={0.62}>{msgInfo.join(" ")}</Balancer>
    </Card>
);

function useTabComponents() {
    const [value, setValue] = useState<MetricSettingsTab[]>();
    useEffect(() => {
        const promises: Promise<MetricSettingsTab>[] = [];
        for (const tab of registry.query()) {
            promises.push(
                tab.load().then((component) => ({
                    key: tab.key as PyramidMetricsKey,
                    label: tab.label,
                    component: component as PyramidMetricsComponent,
                }))
            );
        }
        Promise.all(promises).then(setValue);
    }, []);
    return value;
}

export function MetricsSettings() {
    const tabComponents = useTabComponents();

    const [value, setValue] = useState<PyramidMetrics>();
    const [status, setStatus] = useState<string | null>("loading");
    const [activeTab, setActiveTab] = useState<string>();

    useEffect(() => {
        route("pyramid.metrics")
            .get<PyramidMetrics>()
            .then((data) => {
                setValue(data);
                setStatus(null);
            });
    }, []);

    const [titems, aitems] = useMemo(() => {
        if (value === undefined || tabComponents === undefined) return [];

        const titems = [];
        const aitems = [];
        const readonly = status !== null;

        for (const { key, label, component: Component } of tabComponents) {
            const val = value[key];
            if (val !== undefined) {
                titems.push({
                    key: key,
                    label: label,
                    children: (
                        <Component
                            value={val}
                            onChange={(val) => {
                                setValue({ ...value, ...{ [key]: val } });
                            }}
                            {...{ readonly }}
                        />
                    ),
                });
            } else {
                aitems.push({ key, label });
            }
        }
        return [titems, aitems];
    }, [value, tabComponents, status]);

    const [messageApi, contextHolder] = message.useMessage();

    const add = (key: PyramidMetricsKey) => {
        if (status !== null) return;
        setValue({ ...value, [key]: null });
        setActiveTab(key);
    };

    const remove = (key: PyramidMetricsKey) => {
        if (status !== null) return;
        const newValue = { ...value };
        delete newValue[key];
        setValue(newValue);
        setActiveTab(undefined);
    };

    const save = async () => {
        setStatus("saving");
        try {
            await route("pyramid.metrics").put({
                json:
                    value !== undefined
                        ? Object.fromEntries(
                              Object.entries(value).filter(([, v]) => v)
                          )
                        : null,
            });
            messageApi.open({
                type: "success",
                content: msgSuccess + " " + msgSuccessReload,
            });
        } catch (err) {
            errorModal(err as ApiError);
        } finally {
            setStatus(null);
        }
    };

    return (
        <>
            {contextHolder}
            <PageTitle>
                {aitems && aitems.length > 0 && (
                    <Dropdown
                        menu={{
                            items: aitems,
                            onClick: ({ key }) => add(key as PyramidMetricsKey),
                        }}
                        trigger={["click"]}
                    >
                        <Button type="primary" ghost>
                            {msgAdd}
                        </Button>
                    </Dropdown>
                )}
            </PageTitle>
            {titems && (
                <div className="ngw-pyramid-analytics-settings">
                    {titems.length === 0 ? (
                        <PlaceholderCard />
                    ) : (
                        <Tabs
                            type="editable-card"
                            items={titems && titems.length > 0 ? titems : []}
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            onEdit={(key, action) =>
                                action === "remove" &&
                                remove(String(key) as PyramidMetricsKey)
                            }
                            hideAdd
                        />
                    )}
                    <div>
                        <SaveButton
                            loading={status === "saving"}
                            onClick={save}
                        />
                    </div>
                </div>
            )}
        </>
    );
}

MetricsSettings.targetElementId = "main";
