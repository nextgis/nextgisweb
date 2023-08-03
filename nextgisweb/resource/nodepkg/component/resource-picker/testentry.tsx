/** @testentry react */
import { ResourcePickerCard } from "./ResourcePickerCard";
import type { ResourcePickerCardProps } from "./type";

const presets: [string, ResourcePickerCardProps][] = [
    ["Default resource picker card", {}],
    [
        "Group select",
        {
            pickerOptions: {
                traverseClasses: ["resource_group"],
                hideUnavailable: true,
            },
        },
    ],
    [
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
        <div style={{ maxWidth: "60em" }}>
            {presets.map(([title, props]) => {
                const propsCode = Object.entries(props)
                    .map(([k, v]) =>
                        v === true ? k : k + "={" + JSON.stringify(v) + "}"
                    )
                    .join(" ");
                return (
                    <div key={title} style={{ marginBottom: "1em" }}>
                        <h2>{title}</h2>
                        <code>{`<ResourcePickerCard ${propsCode}/>`}</code>
                        <div style={{ marginTop: "1em" }}>
                            <ResourcePickerCard {...props} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default ResourceSelectTest;
