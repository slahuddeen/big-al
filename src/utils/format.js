// Display helpers shared by the HUD
export const formatWeight = (kg) => {
    if (kg < 0.001) return `${Math.max(1, Math.round(kg * 1e6))}mg`;
    if (kg < 1) return `${Math.round(kg * 1000)}g`;
    if (kg < 100) return `${kg.toFixed(1)}kg`;
    if (kg < 1000) return `${Math.round(kg)}kg`;
    return `${(kg / 1000).toFixed(1)}t`;
};

export const ageLabel = (size) => (size < 0.35 ? 'Young' : size < 0.75 ? 'Subadult' : 'Adult');

export const capitalise = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
