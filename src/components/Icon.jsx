import React from 'react';

// Small stroke icon set (24x24 grid) used across the HUD
const P = {
    heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
    meat: <><ellipse cx="14.5" cy="9.5" rx="6.2" ry="4.8" transform="rotate(-40 14.5 9.5)" /><path d="M10.2 13.8 6.4 17.6" /><circle cx="5.2" cy="17.2" r="1.5" /><circle cx="6.8" cy="18.8" r="1.5" /></>,
    water: <path d="M12 3.5s6 6.6 6 10.8a6 6 0 0 1-12 0C6 10.1 12 3.5 12 3.5z" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
    moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
    sleep: <><path d="M4 18h9" /><path d="M14 5h6l-6 7h6" /><path d="M6 11h4l-4 4h4" /></>,
    drink: <><path d="M12 3.5s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9z" /><path d="M9.5 13.5a2.5 2.5 0 0 0 2.5 2.5" /></>,
    sniff: <><path d="M3 8h9a3 3 0 1 0-3-3" /><path d="M3 12h14a3 3 0 1 1-3 3" /><path d="M3 16h6" /></>,
    dash: <><path d="M13 3 6 13.5h5L10 21l8-11h-5.5L13 3z" /></>,
    roar: <><path d="M4 10v4h3l5 4V6L7 10H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" /></>,
    book: <><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13z" /><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13z" /></>,
    claw: <><path d="M6 4c2 4 2.5 9 1 15" /><path d="M11 3c2 4.5 2.5 10 1 17" /><path d="M16 4c2 4 2.5 9 1 15" /></>,
    pounce: <><path d="M4 18c3-7 8-11 16-12" /><path d="M15 4l5 2-2 5" /></>,
    ambush: <><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /><path d="M5 19 13 11" /></>,
    hatchet: <><path d="M4 14c4-1 8-4 10-9l6 3c-2 5-7 9-14 9" /><path d="M8 13.5l1 3M11 12l1.2 3M14 10l1.4 2.6" /></>,
    lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    rotL: <><path d="M4 12a8 8 0 1 0 2.3-5.6" /><path d="M4 4v4h4" /></>,
    rotR: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4h-4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    target: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    star: <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
    hide: <><path d="M3 18c4-6 14-6 18 0" /><path d="M7 14c1-4 3-7 5-9 2 2 4 5 5 9" /><circle cx="10.5" cy="14.5" r="0.8" /></>,
    cloud: <path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z" />,
    rain: <><path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14z" /><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" /></>,
    storm: <><path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 14z" /><path d="m12 14-2 4h3l-2 4" /></>,
    harass: <><path d="M4 12h10" /><path d="m10 7 5 5-5 5" /><path d="M18 6v12" /></>,
    mist: <><path d="M3 9h12M6 13h15M3 17h10" /></>,
    bone: <><path d="M8 16 16 8" /><circle cx="6.5" cy="17.5" r="2" /><circle cx="17.5" cy="6.5" r="2" /><circle cx="5" cy="15.5" r="1.4" /><circle cx="18.5" cy="8.5" r="1.4" /></>,
    egg: <path d="M12 3.5c3.5 0 6 6 6 10a6 6 0 0 1-12 0c0-4 2.5-10 6-10z" />,
    mud: <><ellipse cx="12" cy="15" rx="8" ry="3.5" /><path d="M8 11c1-2 2-2 3 0M13 9.5c1-2 2-2 3 0" /></>,
    mountain: <><path d="M3 19 9.5 8l3.5 6 2-3 6 8H3z" /></>,
    waterfall: <><path d="M5 4h14" /><path d="M8 4v13M12 4v15M16 4v13" /><path d="M5 20c2-1.5 4-1.5 6 0s4 1.5 6 0" /></>,
    volcano: <><path d="M3 20 9 9h6l6 11H3z" /><path d="M10 5c0-1.5 1-2 2-2s2 .5 2 2" /></>,
    wave: <><path d="M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></>,
    eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
    footprint: <><path d="M9 13c-1.8 0-3 1.7-3 4s1.3 3.5 3 3.5 3-1.2 3-3.5S10.8 13 9 13z" /><circle cx="5.5" cy="9" r="1.4" /><circle cx="9" cy="7" r="1.4" /><circle cx="12.5" cy="9" r="1.4" /></>,
    skull: <><path d="M5 11a7 7 0 1 1 14 0c0 2.5-1.3 4-3 5v3H8v-3c-1.7-1-3-2.5-3-5z" /><circle cx="9.5" cy="11" r="1.5" /><circle cx="14.5" cy="11" r="1.5" /></>,
    warn: <><path d="M12 4 21 19H3L12 4z" /><path d="M12 10v4M12 16.5v.5" /></>,
    info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.5" /></>,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
    leaf: <><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" /></>,
    up: <path d="m6 15 6-6 6 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    map: <><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20V6.5z" /><path d="M9 4v13.5M15 6.5V20" /></>,
    fish: <><path d="M3 12c3-4 8-5 12-3l4-3v12l-4-3c-4 2-9 1-12-3z" /><circle cx="8" cy="11" r="0.8" /></>,
    bug: <><ellipse cx="12" cy="13.5" rx="4" ry="5.5" /><path d="M12 8V5.5M9 4l1.5 2M15 4l-1.5 2M8 11.5H4.5M8 15.5H5M16 11.5h3.5M16 15.5h3" /></>,
    paw: <><circle cx="12" cy="15.5" r="3.5" /><circle cx="6.5" cy="10" r="1.8" /><circle cx="10" cy="6.5" r="1.8" /><circle cx="14" cy="6.5" r="1.8" /><circle cx="17.5" cy="10" r="1.8" /></>,
    level: <><path d="M12 3 4 8v8l8 5 8-5V8l-8-5z" /><path d="M12 8v8M9 11l3-3 3 3" /></>,
    shield: <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3z" />,
    legs: <><path d="M9 3v8l-3 9M15 3v8l3 9" /></>,
    crown: <path d="M4 18h16l-1.5-9-4.5 4-2-6-2 6-4.5-4L4 18z" />,
    mouse: <><rect x="7" y="3" width="10" height="18" rx="5" /><path d="M12 7v3" /></>
};

const Icon = ({ name, size = 18, className = '', stroke = 1.9, style }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
        aria-hidden="true"
    >
        {P[name] || P.info}
    </svg>
);

export default Icon;
