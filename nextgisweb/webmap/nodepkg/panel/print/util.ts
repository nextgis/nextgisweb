import { getURLParams } from "@nextgisweb/webmap/utils/URL";

import type { PrintMapSettings } from "../../print-map/type";

import { urlPrintParams } from "./options";
import type { UrlPrintParams } from "./options";

export function defaultPanelMapSettings(initTitleText: string) {
    return {
        height: 297,
        width: 210,
        margin: 10,
        scale: undefined,
        scaleLine: false,
        scaleValue: false,
        legend: false,
        legendColumns: 1,
        arrow: false,
        title: undefined,
        titleText: initTitleText,
    };
}

export function getPrintUrlSettings(): Partial<PrintMapSettings> {
    const parsed =
        getURLParams<Record<keyof UrlPrintParams<PrintMapSettings>, string>>();

    const settingsUrl: Record<string, unknown> = {};
    for (const [urlParam, urlValue] of Object.entries(parsed) as [
        keyof UrlPrintParams<PrintMapSettings>,
        string,
    ][]) {
        if (!(urlParam in urlPrintParams) || urlValue === null) {
            continue;
        }
        const { fromParam, setting } = urlPrintParams[urlParam];

        if (setting === undefined || !fromParam) {
            continue;
        }

        const value = fromParam(urlValue);
        if (value === undefined) {
            continue;
        }
        settingsUrl[setting] = value as PrintMapSettings[typeof setting];
    }
    return settingsUrl as Partial<PrintMapSettings>;
}

export function getPrintMapLink(mapSettings: PrintMapSettings): string {
    const parsed: Record<string, string> = {};

    for (const [urlParam, value] of Object.entries(getURLParams())) {
        parsed[urlParam] = String(value);
    }

    for (const [urlParam, settingInfo] of Object.entries(urlPrintParams)) {
        const { setting } = settingInfo;
        if (setting === undefined) {
            continue;
        }

        const mapSettingValue = mapSettings[setting];
        parsed[urlParam] = String(
            settingInfo.toParam
                ? settingInfo.toParam(mapSettingValue as never)
                : mapSettingValue
        );
    }

    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const urlWithoutParams = `${origin}${pathname}`;
    const queryString = new URLSearchParams(parsed).toString();

    return `${urlWithoutParams}?${queryString}`;
}
