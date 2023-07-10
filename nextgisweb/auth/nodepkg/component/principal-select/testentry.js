/** @testentry react */
import { PrincipalSelect } from "./PrincipalSelect";

const presets = [
    ["Groups and users (default)", {}],
    ["Multiple groups and users", { multiple: true }],
    ["Users only", { model: "user" }],
    ["Users including system ones", { model: "user", systemUsers: true }],
    ["Users including guest", { model: "user", systemUsers: ["guest"] }],
    ["Groups only", { model: "group" }],
];

function PrincipalSelectTest() {
    return (
        <>
            {presets.map(([title, props]) => {
                const propsCode = Object.entries(props)
                    .map(([k, v]) =>
                        v === true ? k : k + "={" + JSON.stringify(v) + "}"
                    )
                    .join(" ");
                return (
                    <div key={title} style={{ marginBottom: "1em" }}>
                        <h4>{title}</h4>
                        <code>{`<PrincipalSelect ${propsCode}/>`}</code>
                        <div style={{marginTop: "1ex"}}>
                            <PrincipalSelect
                                style={{ width: "40em" }}
                                {...props}
                            />
                        </div>
                    </div>
                );
            })}
        </>
    );
}

export default PrincipalSelectTest;
