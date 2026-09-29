import settings from "@nextgisweb/basemap/client-settings";
import { Alert } from "@nextgisweb/gui/antd";
import { gettextf } from "@nextgisweb/pyramid/i18n";
import { Translated } from "@nextgisweb/pyramid/i18n/translated";

/* prettier-ignore */ const
msgTitle = gettextf("Want to use NextGIS basemaps? Get an API key and URL at {}.");

const { url, banner } = settings.geoservices;

export function GeoservicesBanner() {
  if (!url || !banner) return <></>;

  const human = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const link = (
    <a href={url} target="_blank">
      {human}
    </a>
  );
  return (
    <Alert
      type="info"
      banner
      title={<Translated msgf={msgTitle} args={[link]} />}
    />
  );
}
