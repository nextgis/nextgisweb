export function sleep(time = 300) {
    return new Promise((res) => {
        setTimeout(res, time);
    })
}