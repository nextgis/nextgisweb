type Messages = Record<string, string[]>;
type Context = Record<string, Messages>;
type Index = Record<string, Context>;

export const INDEX: Index = {};
export const NODATA = [];

export function load(domain: string, domainIndex: Context) {
    INDEX[domain] = domainIndex;
}

function idxMessages(domain: string, context: string): Messages {
    let dindex = INDEX[domain];
    if (!dindex) {
        console.log(`[i18n] Domain missing: ${domain}`);
        dindex = INDEX[domain] = { "": { "": NODATA } };
    }
    let cindex = dindex[context];
    if (!cindex) {
        console.log(`[i18n] Context missing: ${domain}.${context}`);
        cindex = dindex[context] = { "": NODATA };
    }
    return cindex;
}

function idxLookup(
    idx: Messages,
    key: string,
    fallback: { (): string[] },
    nplurals: number = 1
): string[] {
    const existing = idx[key];

    if (existing && existing.length >= nplurals) return existing;

    if (idx[""] !== NODATA) {
        const ktype = nplurals === 1 ? "Key" : "PKey";
        console.log(`[i18n] ${ktype} missing: ${key}`);
    }
    const fbvalue = fallback();
    idx[key] = fbvalue;
    return fbvalue;
}

export function lookup(
    domain: string,
    context: string,
    message: string
): string {
    const idx = idxMessages(domain, context);
    return idxLookup(idx, message, () => [message])[0];
}

export function nlookup(
    domain: string,
    context: string,
    singular: string,
    plural: string,
    nplurals: number
): string[] {
    const idx = idxMessages(domain, context);
    const fallback = () => [singular, ...Array(nplurals).fill(plural)];
    return idxLookup(idx, singular, fallback, nplurals);
}
