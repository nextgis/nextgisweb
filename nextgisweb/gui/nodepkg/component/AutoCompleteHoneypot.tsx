/** Honeypot to prevent Chrome from field autocompletion
 *
 * There is no other option to disable Chrome autocompletion, see
 * https://bugs.chromium.org/p/chromium/issues/detail?id=914451 for details.
 * */
export function AutoCompleteHoneypot() {
    const invisible = { display: "none" };
    return (
        <>
            <input style={invisible} name="username" type="text" />
            <input style={invisible} name="password" type="password" />
        </>
    );
}
