/** @testentry react */
import {
    StrictMode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from "react";

// import { useAbortController } from "@nextgisweb/pyramid/hook";

import { Button, CheckboxValue } from "../antd";
import reactApp from "../react-app";
import { sleep } from "../util";

class AbortHelper {
    private abortController = new AbortController();

    rotate() {
        this.abortController = new AbortController();
    }

    abort(reason?: unknown) {
        this.abortController.abort(reason);
    }

    get signal(): AbortSignal {
        return this.abortController.signal;
    }

    // @nextgisweb/pyramid/hook/useAbortController
    makeSignal = () => this.signal;
}

// TODO: Consider replacing @nextgisweb/pyramid/hook/useAbortController
function useAbortController(): Omit<AbortHelper, "rotate"> {
    const ref = useRef<AbortHelper | null>(null);
    if (ref.current === null) {
        ref.current = new AbortHelper();
    }

    useEffect(() => {
        return () => {
            const error = new DOMException("Component unmounted", "AbortError");
            ref.current!.abort(error);
            ref.current!.rotate();
        };
    }, []);

    return ref.current;
}

let itCounter = 0;

function Component({ log }: { log: (...args: Event) => void }) {
    /* eslint-disable react-hooks/exhaustive-deps */

    const it = ++itCounter;

    log(it, "ENTER");

    const abortController = useAbortController();

    const ref = useRef<boolean | null>(null);
    if (ref.current === null) {
        log(it, "useRef");
        ref.current = true;
    }

    useMemo(() => {
        log(it, "useMemo");
    }, []);

    const [counter, setCounter] = useState(() => {
        log(it, "useState");
        return 1;
    });

    useEffect(() => {
        log(it, "useEffect", "Function");

        const signal = abortController.makeSignal();
        sleep(500, { signal: signal }).then(
            () => {
                const extra = signal.aborted ? "Aborted" : "Active";
                log(it, "Resolved", extra);
                setCounter((value) => {
                    const newValue = value + 1;
                    log(it, "Increment", `${value} to ${newValue}`);
                    return newValue;
                });
            },
            (reason) => {
                log(it, "Rejected", String(reason));
            }
        );
        return () => {
            log(it, "useEffect", "Cleanup");
        };
    }, []);

    useLayoutEffect(() => {
        log(it, "useLayoutEffect", "Function");
        return () => {
            log(it, "useLayoutEffect", "Cleanup");
        };
    }, []);

    const result = <>Counter is {counter}</>;
    log(it, "RETURN");
    return result;
}

type Event = [number, string, string?];

function eventsReducer(
    state: Event[],
    data: ["reset"] | ["log", ...Event]
): Event[] {
    const [action, ...rest] = data;
    if (action === "reset") {
        return state;
    } else if (action === "log") {
        return [...state, rest as Event];
    } else {
        throw Error();
    }
}

export default function LifecycleTestentry() {
    const domNode = useRef<HTMLDivElement>(null);
    const [events, dispatch] = useReducer(eventsReducer, [] as Event[]);

    const [strict, setStrict] = useState(false);
    const [started, setStarted] = useState(false);

    const start = useCallback(() => {
        setStarted(true);
        dispatch(["reset"]);
        let component;
        const props = { log: (...args: Event) => dispatch(["log", ...args]) };
        if (strict) {
            component = () => (
                <StrictMode>
                    <Component {...props} />
                </StrictMode>
            );
        } else {
            component = () => <Component {...props} />;
        }
        reactApp(component, {}, domNode.current!);
    }, [strict]);

    return (
        <div>
            <div style={{ marginBottom: "1em" }}>
                <CheckboxValue
                    value={strict}
                    onChange={setStrict}
                    disabled={started}
                >
                    Strict mode
                </CheckboxValue>
                <Button onClick={start} disabled={started}>
                    Start
                </Button>
            </div>
            <div
                ref={domNode}
                style={{
                    display: started ? "block" : "none",
                    border: "1px solid #bbb",
                    padding: "1em",
                    marginBottom: "1em",
                }}
            />
            <table style={{ fontFamily: "monospace", borderSpacing: "8px" }}>
                <tbody>
                    {events.map(([it, msg, extra], idx) => (
                        <tr key={idx}>
                            <td style={{ width: "2em" }}>{it}</td>
                            <td>{msg}</td>
                            <td>{extra}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
