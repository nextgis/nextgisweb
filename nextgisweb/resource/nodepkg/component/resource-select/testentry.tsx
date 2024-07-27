/** @testentry react */
import { ResourceSelect } from "./ResourceSelect";
import { ResourceSelectMultiple } from "./ResourceSelectMultiple";

type PropsType = Record<string, unknown>;

const presets: [React.ComponentType<PropsType>, string, PropsType][] = [
    [
        ResourceSelect,
        "Resource select",
        {
            allowClear: true,
            style: { width: "40rem" },
            placeholder: "Please select",
        },
    ],
    [
        ResourceSelect,
        "Read-only resource select",
        { value: 0, readOnly: true, style: { width: "40rem" } },
    ],
    [
        ResourceSelect,
        "Resource group select",
        {
            style: { width: "40rem" },
            pickerOptions: {
                requireClass: "resource_group",
                hideUnavailable: true,
            },
        },
    ],
    [ResourceSelectMultiple, "Resource multiple select", {}],
    [
        ResourceSelectMultiple,
        "Feature layer selection",
        {
            pickerOptions: {
                requireInterface: "IFeatureLayer",
                hideUnavailable: true,
            },
        },
    ],
];

function ResourceSelectTest() {
    return (
        <div style={{ maxWidth: "60em" }}>
            {presets.map(([Component, title, props]) => {
                const propsCode = Object.entries(props)
                    .map(([k, v]) =>
                        v === true ? k : k + "={" + JSON.stringify(v) + "}"
                    )
                    .join(" ");
                return (
                    <div key={title} style={{ marginBottom: "2em" }}>
                        <h2>{title}</h2>
                        <code>{`<${Component.name} ${propsCode}/>`}</code>
                        <div style={{ marginTop: "1em" }}>
                            <Component {...props} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ResourceSelectTest;
