/** @testentry react */
import { useState } from "react";

import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { Button, Tabs } from "@nextgisweb/gui/antd";
import type { TabsProps } from "@nextgisweb/gui/antd";
import { Code } from "@nextgisweb/gui/component/code";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { FeatureFilterEditor, FeatureFilterModal } from "./index";

const sampleFields: FeatureLayerFieldRead[] = [
    {
        id: 1,
        keyname: "name",
        display_name: "Name",
        datatype: "STRING",
        typemod: null,
        label_field: true,
        grid_visibility: true,
        text_search: true,
        lookup_table: null,
    },
    {
        id: 2,
        keyname: "population",
        display_name: "Population",
        datatype: "INTEGER",
        typemod: null,
        label_field: false,
        grid_visibility: true,
        text_search: false,
        lookup_table: null,
    },
    {
        id: 3,
        keyname: "area",
        display_name: "Area (km²)",
        datatype: "REAL",
        typemod: null,
        label_field: false,
        grid_visibility: true,
        text_search: false,
        lookup_table: null,
    },
    {
        id: 4,
        keyname: "type",
        display_name: "Type",
        datatype: "STRING",
        typemod: null,
        label_field: false,
        grid_visibility: true,
        text_search: true,
        lookup_table: null,
    },
    {
        id: 5,
        keyname: "created_date",
        display_name: "Created Date",
        datatype: "DATE",
        typemod: null,
        label_field: false,
        grid_visibility: true,
        text_search: false,
        lookup_table: null,
    },
    {
        id: 6,
        keyname: "time",
        display_name: "Time",
        datatype: "TIME",
        typemod: null,
        label_field: false,
        grid_visibility: true,
        text_search: false,
        lookup_table: null,
    },
    {
        id: 7,
        keyname: "datetime",
        display_name: "DateTime",
        datatype: "DATETIME",
        typemod: null,
        label_field: false,
        grid_visibility: true,
        text_search: false,
        lookup_table: null,
    },
];

const sampleFilters = {
    simple: JSON.stringify([">", ["get", "population"], 1000000]),
    complex: JSON.stringify([
        "any",
        [">", ["get", "population"], 1000000],
        ["==", ["get", "type"], "city"],
    ]),
    nested: JSON.stringify([
        "all",
        [">", ["get", "population"], 500000],
        [
            "any",
            ["==", ["get", "type"], "city"],
            ["==", ["get", "type"], "town"],
        ],
    ]),
    empty: JSON.stringify([]),
};

const msgOutputJson = gettext("Output JSON");
const msgCurrentState = gettext("Current Filter State");

function FeatureFilterEditorTest() {
    const [currentFilter, setCurrentFilter] = useState<string | undefined>(
        sampleFilters.complex
    );
    const [outputJson, setOutputJson] = useState("");
    const [modalOpen, setModalOpen] = useState(false);

    const handleFilterChange = (filter: string | undefined) => {
        console.log("Filter changed:", filter);
        console.log("Filter type:", typeof filter);
        console.log("Filter is string:", typeof filter === "string");
        console.log(
            "Filter contains transient IDs:",
            filter?.includes("ui_") || false
        );
        setCurrentFilter(filter);
        setOutputJson(filter || "");
    };

    const handleTestSimple = () => {
        setCurrentFilter(sampleFilters.simple);
        setOutputJson(sampleFilters.simple);
    };

    const handleTestComplex = () => {
        setCurrentFilter(sampleFilters.complex);
        setOutputJson(sampleFilters.complex);
    };

    const handleTestNested = () => {
        setCurrentFilter(sampleFilters.nested);
        setOutputJson(sampleFilters.nested);
    };

    const handleTestEmpty = () => {
        setCurrentFilter(sampleFilters.empty);
        setOutputJson(sampleFilters.empty);
    };

    const handleClearOutput = () => {
        setOutputJson("");
    };

    const handleModalApply = (filter: string | undefined) => {
        setCurrentFilter(filter);
        setOutputJson(filter || "");
        setModalOpen(false);
    };

    const outputTabs: TabsProps["items"] = [
        {
            key: "output-json",
            label: msgOutputJson,
            children: <Code lang="json" value={outputJson} />,
        },
        {
            key: "current-state",
            label: msgCurrentState,
            children: (
                <Code
                    lang="json"
                    value={
                        currentFilter
                            ? JSON.stringify(JSON.parse(currentFilter), null, 2)
                            : ""
                    }
                />
            ),
        },
    ];

    return (
        <div style={{ padding: "20px", maxWidth: "1200px" }}>
            <h2>Feature Filter Editor Test</h2>

            <div style={{ marginBottom: "16px" }}>
                <h4 style={{ marginBottom: "8px" }}>Test Presets</h4>
                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "16px",
                    }}
                >
                    <Button size="small" onClick={handleTestSimple}>
                        Simple Filter
                    </Button>
                    <Button size="small" onClick={handleTestComplex}>
                        Complex Filter
                    </Button>
                    <Button size="small" onClick={handleTestNested}>
                        Nested Filter
                    </Button>
                    <Button size="small" onClick={handleTestEmpty}>
                        Empty Filter
                    </Button>
                    <Button size="small" onClick={handleClearOutput}>
                        Clear Output
                    </Button>
                    <Button size="small" onClick={() => setModalOpen(true)}>
                        Test Modal
                    </Button>
                </div>
            </div>

            <div style={{ width: "100%", marginBottom: "20px" }}>
                <h4 style={{ marginBottom: "8px" }}>Filter Editor</h4>
                <FeatureFilterEditor
                    fields={sampleFields}
                    value={currentFilter}
                    onChange={handleFilterChange}
                    showFooter={true}
                />
            </div>

            <div style={{ width: "100%" }}>
                <h4 style={{ marginBottom: "8px" }}>Output & State</h4>
                <Tabs
                    type="card"
                    size="small"
                    items={outputTabs}
                    style={{ minHeight: "200px" }}
                />
            </div>

            <FeatureFilterModal
                open={modalOpen}
                fields={sampleFields}
                value={currentFilter}
                onApply={handleModalApply}
                onCancel={() => setModalOpen(false)}
            />
        </div>
    );
}

export default FeatureFilterEditorTest;
