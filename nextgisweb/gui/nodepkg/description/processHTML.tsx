import { Image } from "antd";
import parse, { domToReact } from "html-react-parser";
import type { DOMNode, HTMLReactParserOptions } from "html-react-parser";
import type { ReactNode } from "react";
import type React from "react";

const processHtml: React.FC<string> = (
    htmlString: string,
    onLinkClick?: (() => boolean) | null
): ReactNode => {
    const options: HTMLReactParserOptions = {
        replace: (node: DOMNode) => {
            if (node.type === "tag") {
                const el = node;

                if (el.name === "img") {
                    const { src, alt } = el.attribs;
                    return <Image src={src} alt={alt} />;
                }

                // there are warning about divs inside p, maybe should be handled in different way
                if (el.name === "p") {
                    return (
                        <div>
                            {domToReact(el.children as DOMNode[], options)}
                        </div>
                    );
                }

                if (el.name === "a" && el.attribs?.href) {
                    const href = el.attribs.href;
                    const target = el.attribs.target;

                    return (
                        <a
                            href={href}
                            target={target}
                            onClick={(e) => {
                                if (onLinkClick) {
                                    if (onLinkClick()) {
                                        e.preventDefault();
                                    }
                                }
                            }}
                        >
                            {domToReact(el.children as DOMNode[], options)}
                        </a>
                    );
                }
            }

            return undefined;
        },
    };
    return <>{parse(htmlString, options)}</>;
};

export { processHtml };
