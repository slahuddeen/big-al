// Every Jehol animal in the model lab, with what the label card says about it
import * as yutyrannus from './yutyrannus.js';
import * as microraptor from './microraptor.js';
import * as sinopterus from './sinopterus.js';

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
    Sinopterus: {
        ...sinopterus, section: 'Pterosaurs and birds', length: '1.2 m wingspan', colour: 'invented',
        group: 'Tapejarid pterosaur · Jiufotang Formation, about 120 million years ago',
        note: 'A short, toothless beak that turned down at the tip and a crest on its head. It walked well on all fours with its wings folded, and probably ate fruit and seeds as well as small animals.'
    }
};
