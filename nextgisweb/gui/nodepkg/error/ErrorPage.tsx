import { useState } from "react";

import type { ErrorInfo } from "./extractError";
import { Body, Footer, TechInfo } from "./shared";

export function ErrorPage({ error }: { error: ErrorInfo }) {
    const [tinfo, setTinfo] = useState(false);

    return (
        <div className="ngw-card" style={{ maxWidth: "40em", padding: "12px" }}>
            <h1 style={{ margin: "0 0 12px 0" }}>{error.title}</h1>
            <Body error={error} />
            {tinfo && <TechInfo error={error} />}
            <Footer tinfo={tinfo} setTinfo={setTinfo} />
        </div>
    );
}
