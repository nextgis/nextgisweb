import { Image } from "antd";
import parse, { domToReact } from "html-react-parser";
import type {
    DOMNode,
    Element,
    HTMLReactParserOptions,
} from "html-react-parser";
import type React from "react";

type ProcessedHtmlProps = {
    htmlString: string;
    onLinkClick?: ((e: React.MouseEvent<HTMLAnchorElement>) => boolean) | null;
};

type ElementWorkaround = Element & {
    data: string;
    type: string;
};

const ProcessedHtml: React.FC<ProcessedHtmlProps> = ({
    htmlString,
    onLinkClick,
}) => {
    const options: HTMLReactParserOptions = {
        replace: (node: DOMNode) => {
            if (node.type === "tag") {
                const el = node as ElementWorkaround;

                const isHollowText = (element: ElementWorkaround): boolean => {
                    if ((element as DOMNode)?.type !== "text") return false;
                    return element.data.replace(/\n/g, "").trim() === "";
                };

                const isAdjacentToNonHollowText = (el: Element): boolean => {
                    if (el.name !== "img") return false;

                    const { nextSibling, previousSibling } = el;
                    return (
                        (nextSibling?.type === "text" &&
                            !isHollowText(
                                nextSibling as unknown as ElementWorkaround
                            )) ||
                        (previousSibling?.type === "text" &&
                            !isHollowText(
                                previousSibling as unknown as ElementWorkaround
                            ))
                    );
                };

                if (el.name === "img") {
                    const { src, alt } = el.attribs;
                    if (isAdjacentToNonHollowText(el)) {
                        return <img src={src} alt={alt} />;
                    } else {
                        return <Image src={src} alt={alt} />;
                    }
                }

                const isImageWrapperParagraph = (el: Element) =>
                    el.name === "p" &&
                    (el?.firstChild as Element)?.name === "img";

                if (isImageWrapperParagraph(el)) {
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

export { ProcessedHtml };
