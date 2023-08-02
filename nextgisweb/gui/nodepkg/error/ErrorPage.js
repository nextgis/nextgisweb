import { useState } from "react";

import { ContentBox } from "@nextgisweb/gui/component";

import { Body, Footer, TechInfo } from "./shared";

export function ErrorPage({ error }) {
    const [tinfo, setTinfo] = useState(false);

    return (
        <ContentBox style={{ maxWidth: "40em" }}>
            <h1>{error.title}</h1>
            <Body error={error} />
            {tinfo && <TechInfo error={error} />}
            <Footer {...{ tinfo, setTinfo }} />
        </ContentBox>
    );
}
