// Every Jehol animal in the model lab, with what the label card says about it
import * as yutyrannus from './yutyrannus.js';
import * as microraptor from './microraptor.js';
import * as sinopterus from './sinopterus.js';
import { Sinosauropteryx, Dilong, Sinocalliopteryx, Zhenyuanlong, Changyuraptor } from './theropods.js';
import { Jinzhousaurus, Dongbeititan, Liaoningosaurus } from './plantEaters.js';
import { Repenomamus, Eomaia, Hyphalosaurus, Monjurosuchus, Xianglong, Manchurochelys, Lycoptera, Peipiaosteus, Feilongus, Dendrorhynchoides } from './smallLife.js';
import { Caudipteryx, Incisivosaurus, Beipiaosaurus, MeiLong, Confuciusornis, Psittacosaurus } from './oddities.js';

export const SECTIONS = ['Tyrannosaurs and raptors', 'Other feathered dinosaurs', 'Plant-eaters', 'Pterosaurs and birds', 'Mammals', 'Lake and forest reptiles', 'Fish'];

export const SPECIES = {
    Yutyrannus: {
        ...yutyrannus, section: 'Tyrannosaurs and raptors', length: '9 m', colour: 'invented',
        group: 'Early tyrannosaur relative · you play as this one',
        note: 'The largest animal known to have had feathers: filaments up to 20 cm long covered its body. It had a crest along its snout and three fingers on each hand. Three were found together, so it may have hunted in groups.'
    },
    Microraptor: {
        ...microraptor, section: 'Tyrannosaurs and raptors', length: '0.8 m', colour: 'known',
        group: 'Four-winged dromaeosaur · Jiufotang Formation, about 120 million years ago',
        note: 'Long flight feathers on its arms and its legs gave it four wings, and a fan of feathers tipped its tail. It glided and may have flown between trees. One was found with a bird in its stomach, another with a fish.'
    },
    Sinosauropteryx: {
        ...Sinosauropteryx, section: 'Tyrannosaurs and raptors', length: '1 m', colour: 'known',
        group: 'Compsognathid',
        note: 'The first dinosaur found with feather-like filaments, in 1996. Pigment cells show a ginger back, a pale belly, a ringed tail and a dark mask through the eye, like a raccoon. One had a lizard in its stomach.'
    },
    Dilong: {
        ...Dilong, section: 'Tyrannosaurs and raptors', length: '1.6 m', colour: 'invented',
        group: 'Small early tyrannosaur',
        note: 'A slender, fast early relative of Tyrannosaurus with a low Y-shaped crest on its snout. Its fossils show simple filaments on the jaw and tail.'
    },
    Sinocalliopteryx: {
        ...Sinocalliopteryx, section: 'Tyrannosaurs and raptors', length: '2.4 m', colour: 'invented',
        group: 'Large compsognathid',
        note: 'A long-tailed hunter with big hands. Its stomach contents are famous: one had eaten two Confuciusornis birds, another a small raptor, Sinornithosaurus.'
    },
    Zhenyuanlong: {
        ...Zhenyuanlong, section: 'Tyrannosaurs and raptors', length: '1.65 m', colour: 'invented',
        group: 'Dromaeosaur with short arms and big wings',
        note: 'Its arms were short for a raptor, yet they carried large, well-formed wing feathers, and its whole tail was fringed with feathers. Too heavy to fly; the wings were probably for display, brooding or balance.'
    },
    Changyuraptor: {
        ...Changyuraptor, section: 'Tyrannosaurs and raptors', length: '1.3 m', colour: 'invented',
        group: 'Four-winged dromaeosaur · Yixian Formation',
        note: 'A larger relative of Microraptor with feathered legs and the longest tail feathers known in a non-bird dinosaur, about 30 cm. The long tail may have helped it slow down and land safely.'
    },
    Caudipteryx: {
        ...Caudipteryx, section: 'Other feathered dinosaurs', length: '1 m', colour: 'partly', colourNote: 'The tail feathers show dark and light bands; the rest is a guess.',
        group: 'Oviraptorosaur',
        note: 'Its name means "tail feather". A short tail ending in a fan, small wings on the arms, long running legs and a short beak with a few teeth at the front. It swallowed stones to help grind plant food.'
    },
    Incisivosaurus: {
        ...Incisivosaurus, section: 'Other feathered dinosaurs', length: '1 m', colour: 'invented',
        group: 'Early oviraptorosaur',
        note: 'Named for its front teeth: a pair of big, rodent-like incisors at the tip of the upper jaw, worn down like a plant-eater\'s. Its other teeth were small and peg-like.'
    },
    Beipiaosaurus: {
        ...Beipiaosaurus, section: 'Other feathered dinosaurs', length: '2.2 m', colour: 'invented',
        group: 'Therizinosaur',
        note: 'A pot-bellied plant-eater with long hand claws, related to the meat-eaters. Under its fuzz it had long, stiff, broad quills, up to 15 cm, on its head, neck and back, probably for display.'
    },
    'Mei long': {
        ...MeiLong, section: 'Other feathered dinosaurs', length: '0.53 m', colour: 'invented',
        group: 'Troodontid',
        note: 'Its name means "soundly sleeping dragon". It was found curled up with its head tucked under its arm, the way birds sleep, buried by volcanic ash where it lay. Large eyes for a small animal.'
    },
    Psittacosaurus: {
        ...Psittacosaurus, section: 'Plant-eaters', length: '1.6 m', colour: 'known',
        group: 'Early horned dinosaur (ceratopsian)',
        note: 'A parrot beak and a horn on each cheek; Triceratops is a distant relative. A row of long bristles stood along its tail. Pigment shows it was darker above and pale below, a camouflage suited to dim forest. A mammal, Repenomamus, was found with a young one in its stomach.'
    },
    Jinzhousaurus: {
        ...Jinzhousaurus, section: 'Plant-eaters', length: '7 m', colour: 'invented',
        group: 'Iguanodont',
        note: 'A large plant-eater that could walk on two legs or four, with a horny beak and grinding cheek teeth. Its hands had three fingers bound into a hoof-like pad. One of the largest animals in the Yixian forests.'
    },
    Dongbeititan: {
        ...Dongbeititan, section: 'Plant-eaters', length: 'about 15 m (estimated)', colour: 'invented',
        group: 'Long-necked sauropod (titanosauriform)',
        note: 'The giant of the Jehol, known from a partial skeleton with a very long neck. Sauropods were rare here, so a herd crossing the forest would have been a big event.'
    },
    Liaoningosaurus: {
        ...Liaoningosaurus, section: 'Plant-eaters', length: '0.34 m (a juvenile)', colour: 'invented',
        group: 'Ankylosaur',
        note: 'The smallest known ankylosaur, known from a young animal. Unusually it had bony plates over its belly as well as its back, and fish remains in its gut suggest it hunted in water, an odd habit for an armoured dinosaur.'
    },
    Confuciusornis: {
        ...Confuciusornis, section: 'Pterosaurs and birds', length: '0.5 m with streamers', colour: 'partly', colourNote: 'Pigment points to dark plumage with paler and spotted areas; the exact pattern is a guess.',
        group: 'Early beaked bird',
        note: 'The oldest known bird with a toothless beak. A big claw on each wing, and in some (probably males) two long tail streamers. Thousands of fossils are known, so it lived in large flocks around the lakes.'
    },
    Sinopterus: {
        ...sinopterus, section: 'Pterosaurs and birds', length: '1.2 m wingspan', colour: 'invented',
        group: 'Tapejarid pterosaur · Jiufotang Formation, about 120 million years ago',
        note: 'A short, toothless beak that turned down at the tip and a crest on its head. It walked well on all fours with its wings folded, and probably ate fruit and seeds as well as small animals.'
    },
    Feilongus: {
        ...Feilongus, section: 'Pterosaurs and birds', length: '2.4 m wingspan', colour: 'invented',
        group: 'Crested pterosaur with an overbite',
        note: 'Long jaws lined with thin teeth, the upper jaw overhanging the lower, and a crest at each end of the skull. It probably snatched fish from the lakes.'
    },
    Dendrorhynchoides: {
        ...Dendrorhynchoides, section: 'Pterosaurs and birds', length: '0.4 m wingspan', colour: 'invented',
        group: 'Anurognathid pterosaur',
        note: 'A tiny, fuzzy pterosaur with a short, wide, frog-like mouth and big eyes, built for catching insects in the air, perhaps at dusk.'
    },
    Repenomamus: {
        ...Repenomamus, section: 'Mammals', length: '0.7 m', colour: 'invented',
        group: 'Gobiconodont mammal',
        note: 'One of the biggest mammals of the dinosaur age, the size of a badger. One was found with a young Psittacosaurus in its stomach, and another locked onto a Psittacosaurus it was attacking when both were buried by a volcanic mudflow.'
    },
    Eomaia: {
        ...Eomaia, section: 'Mammals', length: '0.2 m with tail', colour: 'invented',
        group: 'Early eutherian mammal (a relative of placental mammals)',
        note: 'A mouse-sized climber with dense fur preserved around its body. Its feet were built for gripping branches. Its name means "dawn mother".'
    },
    Hyphalosaurus: {
        ...Hyphalosaurus, section: 'Lake and forest reptiles', length: '0.8 m', colour: 'invented',
        group: 'Choristodere',
        note: 'A swimming reptile with a tiny head on a neck of more than twenty vertebrae. Pregnant females have been found with up to 18 young inside, so some gave birth to live young; others laid eggs.'
    },
    Monjurosuchus: {
        ...Monjurosuchus, section: 'Lake and forest reptiles', length: '0.4 m', colour: 'invented',
        group: 'Choristodere',
        note: 'A small crocodile-like reptile of the lake shallows, with webbed hind feet. Choristoderes were not crocodiles, but some looked and lived much like them.'
    },
    Xianglong: {
        ...Xianglong, section: 'Lake and forest reptiles', length: '0.15 m', colour: 'invented',
        group: 'Gliding lizard',
        note: 'Eight long ribs on each side held out a skin membrane, so it could glide from tree to tree like the living flying lizard Draco. The colours here follow Draco.'
    },
    Manchurochelys: {
        ...Manchurochelys, section: 'Lake and forest reptiles', length: '0.25 m shell', colour: 'invented',
        group: 'Freshwater turtle',
        note: 'A pond turtle of the lakes and slow streams, common in the Yixian beds.'
    },
    Lycoptera: {
        ...Lycoptera, section: 'Fish', length: '8 cm', colour: 'invented',
        group: 'Small bony fish',
        note: 'Huge numbers are preserved together, whole shoals killed at once, probably by volcanic ash or gas falling on the lakes.'
    },
    Peipiaosteus: {
        ...Peipiaosteus, section: 'Fish', length: 'about 0.35 m', colour: 'invented',
        group: 'Relative of sturgeons and paddlefish',
        note: 'A smooth, almost scaleless fish with a pointed snout and a mouth underneath, for feeding near the lake bed.'
    }
};
