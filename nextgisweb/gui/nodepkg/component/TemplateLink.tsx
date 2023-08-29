import { useMemo } from "react";

interface TemplateLinkProps {
    template: string;
    link: string;
    target?: string;
}

export function TemplateLink({ template, link, target }: TemplateLinkProps) {
    const [pre, text, post] = useMemo(() => {
        let m = template.match(/^(.*)\[(.+?)\](.*)$/);
        if (!m) m = template.match(/^(.*)<a>(.+?)<\/a>(.*)$/);
        if (m) {
            return m.slice(1, 4);
        } else {
            return [template, undefined, undefined];
        }
    }, [template]);

    return (
        <>
            {pre}
            <a href={link} {...{ target }}>
                {text}
            </a>
            {post}
        </>
    );
}
