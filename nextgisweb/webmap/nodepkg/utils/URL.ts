export interface URLParams {
    [key: string]: string | boolean;
}

interface StateData {
    url: string;
    params?: Record<string, string>;
    type?: string;
}

interface PushStateData {
    state: StateData;
    url: string;
}

function _pushState(data: PushStateData): void {
    if (history) {
        history.replaceState(data.state, document.title, data.url);
    }
}

export function getURLParams<U = URLParams>(): Record<keyof U, string> {
    const params: URLParams = {};

    window.location.href.replace(
        /[?&]+(\w+)([^&]*)/gi,
        function (m: string, key: string): string {
            params[key] = true;
            return ""; // does not matter
        }
    );

    window.location.href.replace(
        /[?&]+([^=&]+)=([^&]*)/gi,
        function (m: string, key: string, value: string): string {
            params[key] = decodeURIComponent(value);
            return ""; // does not matter
        }
    );

    return params as Record<keyof U, string>;
}

export function removeURLParameter(key: string): PushStateData {
    const sourceUrl = location.search;
    let rtn = sourceUrl.split("?")[0];
    let param: string;
    let paramsArr: string[];
    const queryString =
        sourceUrl.indexOf("?") !== -1 ? sourceUrl.split("?")[1] : "";

    if (queryString !== "") {
        paramsArr = queryString.split("&");
        for (let i = paramsArr.length - 1; i >= 0; i -= 1) {
            param = paramsArr[i].split("=")[0];
            if (param === key) {
                paramsArr.splice(i, 1);
            }
        }
        rtn = rtn + "?" + paramsArr.join("&");
    }

    const data = {
        state: { url: rtn, type: "remove" },
        url: rtn,
    };

    _pushState(data);

    return data;
}

export function setURLParam(
    name: string,
    value: string
): PushStateData | undefined {
    if (value) {
        let search: string;
        const urlComponent = encodeURIComponent(value);
        const urlParams = getURLParams();
        const existUrlParam = urlParams[name];

        if (existUrlParam) {
            search = location.search.replace(
                new RegExp("([?|&]" + name + "=)" + "(.+?)(&|$)"),
                "$1" + urlComponent + "$3"
            );
        } else if (location.search.length) {
            search = location.search + "&" + name + "=" + urlComponent;
        } else {
            search = "?" + name + "=" + urlComponent;
        }

        const params: Record<string, string> = {};
        params[name] = value;

        const data = {
            state: { url: search, params: params },
            url: search,
        };

        _pushState(data);
        return data;
    } else {
        return removeURLParameter(name);
    }
}
