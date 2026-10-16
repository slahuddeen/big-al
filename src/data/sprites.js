// ==================== PIXEL-ART SPRITES FOR THE UI ====================
// Trimmed, web-sized copies of the pixel art in public/assets/dinos live in
// public/assets/sprites. Species without their own art borrow a close relative
// and shift its colours with a CSS filter. Anything not listed falls back to a
// rendered portrait of its 3D model.
const S = (file, filter = null) => ({ src: `${import.meta.env.BASE_URL}assets/sprites/${file}.png`, filter });

export const SPRITES = {
    Dragonfly: S('dragonfly'),
    Centipede: S('centipede'),
    Mammal: S('mammal'),
    Lizard: S('lizard'),
    Sphenodontian: S('sphenodontian'),
    Fish: S('fish'),
    Compsognathus: S('compsognathus'),
    Coelurus: S('coelurus'),
    Hesperornithoides: S('hesperornithoides'),
    Ornitholestes: S('ornitholestes'),
    Stokesosaurus: S('stokesosaurus'),
    Camptosaurus: S('camptosaurus'),
    // Dryosaurus uses its rendered 3D portrait: the model follows newer reconstructions (beak, stripes, bristle crest)
    Othnielia: S('othnielia'),
    Harpactognathus: S('harpactognathus'),
    Mesadactylus: S('mesadactylus'),
    Kepodactylus: S('kepodactylus'),
    Rhamphorhynchus: S('rhamphorhynchus'),
    'Injured Pterosaur': S('rhamphorhynchus', 'grayscale(0.55) brightness(0.8) sepia(0.3)'),
    Ceratosaurus: S('ceratosaurus'),
    'Juvenile Allosaurus': S('male-allosaurus', 'saturate(0.75) brightness(1.12) hue-rotate(18deg)'),
    'Male Allosaurus': S('male-allosaurus'),
    'Female Allosaurus': S('female-allosaurus'),
    Torvosaurus: S('torvosaurus'),
    Saurophaganax: S('male-allosaurus', 'hue-rotate(-75deg) saturate(0.8) brightness(0.62) contrast(1.15)'),
    Stegosaurus: S('stegosaurus'),
    Kentrosaurus: S('stegosaurus', 'hue-rotate(-110deg) saturate(0.7) brightness(1.05)'),
    Tuojiangosaurus: S('stegosaurus', 'hue-rotate(170deg) saturate(1.1)'),
    Diplodocus: S('diplodocus'),
    Brachiosaurus: S('diplodocus', 'hue-rotate(70deg) saturate(0.6) brightness(0.92)'),
    Camarasaurus: S('diplodocus', 'hue-rotate(-25deg) saturate(0.5) brightness(0.85)')
};

// Big Al grows out of the cartoon hatchling art into a full allosaur
export const bigAlSprite = (level) => (level <= 1 ? S('big-al-hatchling') : S('male-allosaurus', level === 2 ? 'saturate(0.85) brightness(1.1)' : null));

export const spriteFor = (species, level = 1) => (species === 'Big Al' ? bigAlSprite(level) : SPRITES[species] || null);
