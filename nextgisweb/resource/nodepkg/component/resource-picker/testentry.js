/** @testentry react */
import { ResourcePickerCard } from "./ResourcePickerCard";

const presets = [
    [ResourcePickerCard, "Default resource picker card", {}],
    [
        ResourcePickerCard,
        "Group select",
        {
            pickerOptions: {
                traverseClasses: ["resource_group"],
                hideUnavailable: true,
            },
        },
    ],
    [
        ResourcePickerCard,
        "Feature layer select",
        {
            pickerOptions: {
                traverseClasses: ["resource_group"],
                requireInterface: "IFeatureLayer",
                hideUnavailable: true,
            },
        },
    ],
];

function ResourceSelectTest() {
    return (
        <div style={{maxWidth: "60em"}}>
            {presets.map(([Component, title, props]) => {
                const propsCode = Object.entries(props)
                    .map(([k, v]) =>
                        v === true ? k : k + "={" + JSON.stringify(v) + "}"
                    )
                    .join(" ");
                return (
                    <div key={title} style={{ marginBottom: "1em" }}>
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
