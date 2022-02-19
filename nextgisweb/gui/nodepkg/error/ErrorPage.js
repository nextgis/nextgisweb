import { useState } from "react";
import { ContentBox } from "@nextgisweb/gui/component";
import { Footer, Body, TechInfo } from "./shared";

export function ErrorPage({ error }) {
    const tinfoState = useState(false);

    return (
        <ContentBox style={{ maxWidth: "40em" }}>
            <h1>{error.title}</h1>
            <Body error={error} />
            <TechInfo state={tinfoState} error={error} />
            <Footer tinfoState={tinfoState} />
        </ContentBox>
    );
}
