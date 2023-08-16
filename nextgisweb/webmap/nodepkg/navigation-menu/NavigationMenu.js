import PropTypes from "prop-types";

import "./NavigationMenu.less";

export function NavigationMenu({ panels, onClick, active }) {
    const onClickItem = (item) => {
        if (onClick) {
            onClick(item);
        }
    };

    let menuItems = [];
    if (panels) {
        panels.forEach((p) => {
            const activeClass = p.name === active ? "active" : "";
            menuItems.push(
                <div
                    key={p.name}
                    className={`navigation-menu__item ${activeClass}`}
                    title={p.title}
                    onClick={() => onClickItem(p)}
                >
                    <svg className="icon" fill="currentColor">
                        <use xlinkHref={`#icon-${p.menuIcon}`} />
                    </svg>
                </div>
            );
        });
    }
    return <div className="navigation-menu">{menuItems}</div>;
}

NavigationMenu.propTypes = {
    panels: PropTypes.object,
    onClick: PropTypes.func,
    active: PropTypes.string,
};
