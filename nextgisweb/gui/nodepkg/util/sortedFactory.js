export function sorterFactory(attr) {
    return (a, b) => {
        const va = a[attr];
        const vb = b[attr];
        if (va == vb) return 0;
        if (va > vb) return 1;
        if (vb > va) return -1;
    };
}
