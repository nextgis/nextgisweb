/** @testentry react */
import { Button } from "@nextgisweb/gui/antd";

export default function Testentry() {
    return (
        <Button
            onClick={() => {
                throw new Error("Hello, Sentry!");
            }}
        >
            Hello, Sentry!
        </Button>
    );
}
