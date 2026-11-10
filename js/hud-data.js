/**
 * SMZ Coaches V2 — Field HUD settings
 *
 * The HUD is the live game screen (timer, diagram, scoreboard, music).
 * It is switched on for every game listed in HUD_GAMES below.
 *
 * To add a game: it needs a diagram and a game card first, then add a line.
 *   mode   'team' or 'solo' — which side of the scoreboard opens first
 *   teams  how many teams to start with (2 to 5)
 *   roles  the special roles in the game (shown on the Solo tab); [] if none
 *   song   optional: { title, url } to give this game its own song
 */

// The song every HUD game uses for now.
const HUD_SONG = {
  title: 'So Flute',
  url: 'https://music.apple.com/us/album/so-flute/717406560?i=717406747',
};

// Round timer buttons, in minutes. HUD_DEFAULT_MINUTES must be one of them.
const HUD_MINUTES = [1, 3, 5];
const HUD_DEFAULT_MINUTES = 5;

const HUD_TEAMS = [
  { name: 'Blue',   color: '#3b82f6', tint: '#9cc2ff' },
  { name: 'Red',    color: '#ef4444', tint: '#ff9c9c' },
  { name: 'Yellow', color: '#eab308', tint: '#f5d67a' },
  { name: 'Green',  color: '#22c55e', tint: '#7ee2a4' },
  { name: 'Purple', color: '#a855f7', tint: '#d3a9ff' },
];

const HUD_GAMES = {
  'adventure-quest':  { mode: 'team', teams: 3, roles: ['Crystal Carriers'] },
  'crystal-capture':  { mode: 'team', teams: 3, roles: [] },
  'meteor-shower':    { mode: 'solo', teams: 2, roles: ['Runners', 'Space Monkeys'] },
  'pirate-ship':      { mode: 'team', teams: 2, roles: ['Scuba Divers'] },
  'robo-shark':       { mode: 'solo', teams: 2, roles: ['Robo Sharks'] },
  'royal-rescue':     { mode: 'team', teams: 2, roles: ['Knights', 'Archers', 'Wizards', 'Royals'] },
  'sportnite':        { mode: 'solo', teams: 2, roles: [] },
  'super-seeker':     { mode: 'solo', teams: 2, roles: ['Seekers'] },
  'survivor':         { mode: 'solo', teams: 2, roles: [] },
  'troopers-vs-jedi': { mode: 'solo', teams: 2, roles: ['Jedi', 'Troopers'] },
};

function hudHas(id) { return Object.prototype.hasOwnProperty.call(HUD_GAMES, id); }
