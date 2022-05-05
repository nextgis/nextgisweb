const { stringifyRequest } = require('loader-utils');
const { stringifySymbol } = require('svg-sprite-loader/lib/utils');

module.exports = function ({ symbol, config, context }) {
    const { spriteModule, symbolModule } = config;

    const spriteRequest = stringifyRequest({ context }, spriteModule);
    const symbolRequest = stringifyRequest({ context }, symbolModule);

    return `
        import Symbol from ${symbolRequest};
        import sprite from ${spriteRequest};

        const symbol = new Symbol(${stringifySymbol(symbol)});
        sprite.add(symbol);

        function Icon({...props}) {
            return (
                <svg {...props} className="icon" fill="currentColor">
                    <use xlinkHref="#${symbol.id}"/>
                </svg>
            );
        };

        Icon.id = "${symbol.id}";

        export default Icon;
    `;

};
