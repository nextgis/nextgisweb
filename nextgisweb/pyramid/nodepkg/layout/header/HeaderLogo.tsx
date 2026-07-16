import { routeURL } from "../../api";

const config = ngwConfig.headerLogo;

export default function HeaderLogo() {
  switch (config.type) {
    case "builtin":
      return (
        <a
          href={ngwConfig.applicationUrl}
          // eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml
          dangerouslySetInnerHTML={{
            __html: config.content,
          }}
        />
      );

    case "custom":
      return (
        <a href={ngwConfig.applicationUrl}>
          <img src={routeURL("pyramid.asset.hlogo") + `?ckey=${config.ckey}`} />
        </a>
      );
  }
}
