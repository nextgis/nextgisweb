import { Image } from "antd";
import parse, { domToReact } from "html-react-parser";
import type { DOMNode, HTMLReactParserOptions } from "html-react-parser";
import type { ReactNode } from "react";
import type React from "react";

const processHtml: React.FC<string> = (
    htmlString: string,
    onLinkClick?: ((e: React.MouseEvent<HTMLAnchorElement>) => boolean) | null
): ReactNode => {
    const options: HTMLReactParserOptions = {
        replace: (node: DOMNode) => {
            if (node.type === "tag") {
                const el = node;

                const isInTextImage =
                    el.name === "img" &&
                    (el.nextSibling?.type === "text" ||
                        el.previousSibling?.type === "text");

                if (el.name === "img") {
                    const { src, alt } = el.attribs;
                    if (isInTextImage) {
                        return <img src={src} alt={alt} />;
                    } else {
                        return <Image src={src} alt={alt} />;
                    }
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
                                    if (onLinkClick(e)) {
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
