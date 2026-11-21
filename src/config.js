// Tunables, palettes and word lists. Nothing in here has behaviour.
export const SAVE_KEY = 'critterville-v1';
export const SAVE_VERSION = 3;
export const INK = '#000';
export const PAPER = '#fffdf8';
export const LW = 2.6;          // outline thickness, in world units
export const DAY_LEN = 300;     // seconds per in-game day
export const FONT = '700 15px "Chalkboard SE","Comic Sans MS","Comic Neue","Marker Felt",cursive';

export const HOUSE = { w: 92, h: 58, residents: 3 };
export const SWING = { barH: 130, rope: 84, half: 80, seats: [-30, 30], maxAngle: 0.42 };

export const HEADS = ['#ff8fc7', '#8fd3ff', '#b7a6ff', '#ffab76', '#8fe3b0', '#ff8f8f', '#ffd36b', '#c9f27a', '#f5a8ff', '#7fe0d8'];
export const BODIES = ['#ffe66d', '#ffd1e8', '#c8f0ff', '#d9d0ff', '#ffd9b8', '#d2f5c4', '#ffffff', '#ffc2c2'];
export const WALLS = ['#ffe3c2', '#d9ecff', '#ffd6e6', '#e2f7d0', '#fff3b0', '#e6dcff'];
export const ROOFS = ['#ff8f8f', '#8fb8ff', '#ffab76', '#b7a6ff', '#7fd6a0', '#ff8fc7'];
export const PETALS = ['#ff8fc7', '#ffd36b', '#b7a6ff', '#ff8f8f', '#8fd3ff', '#ffffff', '#ffab76'];
export const GREENS = ['#9fe0a0', '#b5e88f', '#86d9b0'];
export const WOOD = '#c9966b';
export const STONE = '#d8d8e0';

// Internet radio streams for the ♪ radio button (src/radio.js). Any direct
// MP3/AAC stream URL works here.
export const STATIONS = [
  { name: 'lofi', url: 'https://lofi.stream.laut.fm/lofi', credit: 'lofi on laut.fm' },
  { name: 'chillhop', url: 'https://streams.ilovemusic.de/iloveradio17.mp3', credit: 'I Love Chillhop (ilovemusic.de)' },
];

export const CHAT = ['♥', '♪', '?', '!', 'ha', 'oh!', 'hm', 'hehe', 'wow', 'ok!', 'fish?', 'nice', 'bloop', 'yes', 'no!', '...'];
export const NAME_A = ['Bo', 'Mi', 'Pu', 'Ta', 'Lo', 'Ki', 'Nu', 'Fe', 'Zu', 'Wa', 'Do', 'Pi', 'Mo', 'Gu', 'Bee', 'To', 'Ni', 'Yo', 'Ha', 'Bli'];
export const NAME_B = ['bo', 'mi', 'p', 'ko', 'lu', 'ffy', 'ble', 'ns', 'zu', 'dle', 'b', 'mo', 't', 'nk', 'mbo', 'ppa', 'x', ''];
