/** @testentry react */
import { testContent } from "./testContent";

import { DescriptionComponent } from "./index";

export default function DescriptionComponentTestEntry() {
    return <DescriptionComponent content={testContent} />;
}
