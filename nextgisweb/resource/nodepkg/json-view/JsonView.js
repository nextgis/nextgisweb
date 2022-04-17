import { useEffect, useState } from "react";
import { Code } from "@nextgisweb/gui/component/code";
import { Skeleton } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";

export function JsonView(props) {
    const [body, setBody] = useState(null);
    useEffect(async () => {
        const data = await route('resource.item', props.id).get();
        setBody(JSON.stringify(data, null, 2));
    }, [])

    if (body === null) {
        return <Skeleton title={false} paragraph={{rows: 4}}/>
    }
    return <Code
        value={body}
        lang="json"
        readOnly
        lineNumbers
    ></Code>;
}
