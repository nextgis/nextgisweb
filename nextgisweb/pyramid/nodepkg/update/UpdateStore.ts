import { sortBy } from "lodash-es";
import { action, computed, observable } from "mobx";

import { sleep } from "@nextgisweb/gui/util";

const query_delay_ms = 3 * 60 * 1000;
const { ngupdateUrl, distribution } = ngwConfig;

interface UpdateQueryResponse {
    distribution: {
        status: "not_found" | "has_update" | "has_urgent_update" | "up_to_date";
        latest?: {
            version: string;
            date: string;
        };
    };
}

type HasUpdateData = {
    version: string;
    date: string;
    critical: boolean;
    notesUrl: string;
};

type UpdateStatus =
    | ["disabled" | "loading" | "error" | "not_found" | "up_to_date"]
    | ["has_update", HasUpdateData];

export class UpdateStore {
    @observable.ref accessor state: UpdateStatus = ["disabled"];

    private forceResolve: () => void = () => {};

    constructor() {
        if (ngupdateUrl) {
            this.setState(["loading"]);

            const forcePromise = new Promise((resolve) => {
                this.forceResolve = () => resolve(undefined);
            });

            Promise.any([sleep(query_delay_ms), forcePromise]).then(() =>
                this.request()
            );
        }
    }

    force() {
        this.forceResolve();
    }

    @computed
    get hasUpdate() {
        const [status, data] = this.state;
        return status === "has_update" ? data : undefined;
    }

    @action
    private request() {
        const paramsBase: string[] = [];
        const enc = encodeURIComponent;

        if (distribution && distribution.version) {
            const { name: dn, version: dv } = distribution;
            paramsBase.push(`distribution=${enc(dn)}:${enc(dv)}`);
        }

        sortBy(Object.entries(ngwConfig.packages), ([n]) => n).forEach(
            ([pn, pv]) => paramsBase.push(`package=${enc(pn)}:${enc(pv)}`)
        );

        paramsBase.push(`instance=${enc(ngwConfig.instanceId)}`);

        const paramsQuery = [...paramsBase];
        paramsQuery.push(`event=check_for_updates`);

        this.setState(["loading"]);
        const url = `${ngupdateUrl}/api/query?${paramsQuery.join("&")}`;

        const errback = () => this.setState(["error"]);
        const process = ({ distribution: udist }: UpdateQueryResponse) => {
            const { status } = udist;
            if (status === "not_found" || status === "up_to_date") {
                this.setState([status]);
            } else if (
                status === "has_update" ||
                status === "has_urgent_update"
            ) {
                const { version, date } = udist.latest!;
                const critical = status === "has_urgent_update";

                const paramsNotes = [...paramsBase];
                paramsNotes.push(`lang=${ngwConfig.locale}`);
                paramsNotes.push(`title=false`);
                const notesUrl = `${ngupdateUrl}/api/notes?${paramsNotes.join("&")}`;

                this.setState([
                    "has_update",
                    { version, date, critical, notesUrl },
                ]);
            }
        };

        fetch(url).then((resp) => resp.json().then(process, errback), errback);
    }

    @action
    private setState(value: UpdateStatus) {
        this.state = value;
    }
}

export const updateStore = new UpdateStore();
