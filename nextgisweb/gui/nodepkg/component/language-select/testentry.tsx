/** @testentry react */
import { LanguageSelect } from "./LanguageSelect";
import type { LanguageSelectProps } from "./LanguageSelect";

const presets: [title: string, props: LanguageSelectProps][] = [
    ["Language select (default)", {}],
    ["Language select with contribute proposal", { contribute: true }],
];

function LanguageSelectTest() {
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
                        <code>{`<LanguageSelect ${propsCode}/>`}</code>
                        <div style={{ marginTop: "1ex" }}>
                            <LanguageSelect
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

export default LanguageSelectTest;
