// Tunables, palettes and word lists. Nothing in here has behaviour.
export const SAVE_KEY = 'critterville-v1';
export const SAVE_VERSION = 4;
export const INK = '#000';
export const PAPER = '#fffdf8';
export const LW = 2.6;          // outline thickness, in world units
export const DAY_LEN = 300;     // seconds per in-game day
export const FONT = '700 15px "Chalkboard SE","Comic Sans MS","Comic Neue","Marker Felt",cursive';

export const HOUSE = { w: 96, h: 80, roof: 50, upstairs: 32, scale: 1.2, residents: 3 };   // upstairs: extra wall height from that add-on
export const ADDONS = ['chimney', 'annex', 'upstairs'];
// How far a painter can "see" from the easel, in world units.
export const VIEW = { rx: 260, ry: 175 };
export const STREAM_HALF = 17;      // half the width of a stream
export const BRIDGE = { reach: STREAM_HALF + 16, half: 13, detour: 320 };   // reach: centre to each end; detour: how far they'll walk to use it
export const TANK = { w: 66, h: 40, legs: 22, holds: 6 };   // the fish tank: glass size, stand height, how many it holds
export const SWING = { barH: 130, rope: 84, half: 80, seats: [-30, 30], maxAngle: 0.42 };

export const HEADS = ['#ff8fc7', '#8fd3ff', '#b7a6ff', '#ffab76', '#8fe3b0', '#ff8f8f', '#ffd36b', '#c9f27a', '#f5a8ff', '#7fe0d8'];
export const BODIES = ['#ffe66d', '#ffd1e8', '#c8f0ff', '#d9d0ff', '#ffd9b8', '#d2f5c4', '#ffffff', '#ffc2c2'];
export const WALLS = ['#7fc4fd', '#ffe3c2', '#d9ecff', '#ffd6e6', '#e2f7d0', '#fff3b0', '#e6dcff'];
export const ROOFS = ['#ee9450', '#ff8f8f', '#8fb8ff', '#ffab76', '#b7a6ff', '#7fd6a0', '#ff8fc7'];
export const PETALS = ['#ff6e45', '#ff8fc7', '#b7a6ff', '#ff6e45', '#8fd3ff', '#ffab76', '#f5a8ff'];
export const GREENS = ['#adeb3c', '#9fe64a', '#bdee4c'];
export const WOOD = '#c9966b';
export const STONE = '#d8d8e0';

// Internet radio streams for the ♪ radio button (src/radio.js). Any direct
// MP3/AAC stream over https works here, as long as the station is happy to be
// played from a web page (SomaFM, for one, is not). `name` is what the button
// says, so keep it short; `credit` is who's really broadcasting, for the ticker.
// Found through the radio-browser.info directory.
export const STATIONS = [
  { name: 'lofi', url: 'https://lofi.stream.laut.fm/lofi', credit: 'lofi on laut.fm' },
  { name: 'chillhop', url: 'https://streams.ilovemusic.de/iloveradio17.mp3', credit: 'I Love Chillhop (ilovemusic.de)' },
  { name: 'lofi beats', url: 'https://listen.reyfm.de/lofi_128kbps.mp3', credit: 'REYFM #lofi (reyfm.de)' },
  { name: 'lofi jazz', url: 'https://radiorecord.hostingradio.ru/lofi96.aacp', credit: 'Radio Record Lo-Fi (radiorecord.ru)' },
  { name: 'island lofi', url: 'https://radio.nia.nc/radio/8020/lofi-hq-stream.aac', credit: 'NIA Radio Lo-Fi (nia.nc)' },
  { name: 'easy lofi', url: 'https://stream.0nlineradio.com/lo-fi', credit: '0nlineradio LO-FI (0nlineradio.com)' },
  { name: 'study', url: 'https://das-sa39.cdnstream1.com/5582_128', credit: 'LITT Live Lofi (littlive.com)' },
  { name: 'jazzhop', url: 'https://stream.epic-lounge.com/jazzhop-lounge', credit: 'Epic Lounge Jazzhop (epic-lounge.com)' },
  { name: 'lounge', url: 'https://stream.epic-lounge.com/workday-lounge', credit: 'Epic Lounge Workday Lounge (epic-lounge.com)' },
  { name: 'cafe', url: 'https://s35.derstream.net/100austria.mp3', credit: 'Lounge.FM (lounge.fm)' },
  { name: 'smooth jazz', url: 'https://0n-smoothjazz.radionetz.de/0n-smoothjazz.aac', credit: '0N Smooth Jazz (0nradio.com)' },
  { name: 'chill', url: 'https://media-ssl.musicradio.com/ChillMP3', credit: 'Smooth Chill (smoothradio.com)' },
  { name: 'ambient', url: 'https://0n-chillout.radionetz.de/0n-chillout.aac', credit: '0N Chillout (0nradio.com)' },
  { name: 'retro', url: 'https://daystream.palmerablanca.com/daystream-128.mp3', credit: 'Palmera Blanca Daystream (palmerablanca.com)' },
  { name: 'electronic', url: 'https://public.isekoi-radio.com/listen/chill/radio.mp3', credit: 'ISEKOI Radio Chill Zone (isekoi-radio.com)' },
  { name: 'drum & bass', url: 'https://stream.brokenbeats.net/tune', credit: 'Brokenbeats (brokenbeats.net)' },
  { name: 'classical', url: 'https://stream.epic-classical.com/classical-music-for-sleep', credit: 'Epic Classical (epic-classical.com)' },
  { name: 'sleepy', url: 'https://stream.epic-lounge.com/sleep-meditation', credit: 'Epic Lounge Sleep & Meditation (epic-lounge.com)' },
  { name: 'rain', url: 'https://maggie.torontocast.com:2020/stream/natureradiorain', credit: 'Nature Radio Rain (torontocast.stream)' },
  { name: 'nature', url: 'https://purenature-mynoise.radioca.st/stream', credit: 'myNoise Pure Nature (mynoise.net)' },
];

export const CHAT = ['♥', '♪', '?', '!', 'ha', 'oh!', 'hm', 'hehe', 'wow', 'ok!', 'fish?', 'nice', 'bloop', 'yes', 'no!', '...'];
export const NAME_A = ['Bo', 'Mi', 'Pu', 'Ta', 'Lo', 'Ki', 'Nu', 'Fe', 'Zu', 'Wa', 'Do', 'Pi', 'Mo', 'Gu', 'Bee', 'To', 'Ni', 'Yo', 'Ha', 'Bli'];
export const NAME_B = ['bo', 'mi', 'p', 'ko', 'lu', 'ffy', 'ble', 'ns', 'zu', 'dle', 'b', 'mo', 't', 'nk', 'mbo', 'ppa', 'x', ''];
