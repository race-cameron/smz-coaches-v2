/**
 * SMZ Coaches V2 — Game card artwork
 *
 * Which games have a finished Power Card. Each one has two files:
 *   assets/game-cards/<game-id>.jpg       the whole card (game page)
 *   assets/game-cards/art/<game-id>.jpg   just the picture inside the frame (Games page)
 *
 * When you make a new game card: add both files, then add the game id
 * to this list. Games not on the list show a "Card coming soon" placeholder.
 */
const GAME_CARDS = [
  'adventure-quest', 'charge', 'coco-nuts', 'crystal-capture', 'dragon-slayer',
  'meteor-shower', 'pirate-ship', 'robo-shark', 'royal-rescue', 'sportnite',
  'super-seeker', 'survivor', 'troopers-vs-jedi', 'zorb-lord',
];

function gameCardArt(id)  { return GAME_CARDS.includes(id) ? `assets/game-cards/art/${id}.jpg` : null; }
function gameCardFull(id) { return GAME_CARDS.includes(id) ? `assets/game-cards/${id}.jpg` : null; }
