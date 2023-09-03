import { useState } from "react";

import { Body, Footer, TechInfo } from "./shared";

export function ErrorPage({ error }) {
    const [tinfo, setTinfo] = useState(false);

    return (
        <div className="ngw-card" style={{ maxWidth: "40em", padding: "12px" }}>
            <h1>{error.title}</h1>
            <Body error={error} />
            {tinfo && <TechInfo error={error} />}
            <Footer {...{ tinfo, setTinfo }} />
        </div>
    );
}
