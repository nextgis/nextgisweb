/** @testentry react */
import { testContent } from "./testContent";

import { DescriptionHtml } from "./index";

export default function DescriptionComponentTestEntry() {
    return (
        <>
            <div
                style={{
                    height: "200px",
                    border: "2px solid black",
                }}
            >
                <DescriptionHtml content={testContent} />
            </div>

            <br />

            <div
                style={{
                    width: "400px",
                    border: "2px solid black",
                }}
            >
                <DescriptionHtml variant="compact" content={testContent} />
            </div>
        </>
    );
}
