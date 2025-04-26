import { Image } from "antd";
import parse, { domToReact } from "html-react-parser";
import type { DOMNode, HTMLReactParserOptions } from "html-react-parser";
import type React from "react";

interface HtmlToReactWithImagesProps {
    htmlString: string;
}

const processHtmlWithImage: React.FC<HtmlToReactWithImagesProps> = ({
    htmlString,
}) => {
    const options: HTMLReactParserOptions = {
        replace: (node: DOMNode) => {
            if (node.type === "tag") {
                const el = node;

                if (el.name === "img") {
                    const { src, alt } = el.attribs;
                    return <Image src={src} alt={alt} />;
                }

                // there are warning about divs inside p, while
                if (el.name === "p") {
                    return (
                        <div>
                            {domToReact(el.children as DOMNode[], options)}
                        </div>
                    );
                }
            }

            return undefined;
        },
    };
    return <>{parse(htmlString, options)}</>;
};

export { processHtmlWithImage };
