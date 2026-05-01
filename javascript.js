/* =============================================
   ORACLE SANDI LABB — oracle-script.js
   ============================================= */

"use strict";

// ── STATE ──────────────────────────────────────
let userData       = {};
let currentSpread  = "general";
let chatHistory    = [];
let musicLoaded    = false;
let musicPlaying   = false;

// ── ASTROLOGY DATA ─────────────────────────────
const zodiacSigns = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const zodiacEmoji = { Aries:"♈",Taurus:"♉",Gemini:"♊",Cancer:"♋",Leo:"♌",Virgo:"♍",Libra:"♎",Scorpio:"♏",Sagittarius:"♐",Capricorn:"♑",Aquarius:"♒",Pisces:"♓" };
const signElement = { Aries:"Fire 🔥",Taurus:"Earth 🌍",Gemini:"Air 💨",Cancer:"Water 🌊",Leo:"Fire 🔥",Virgo:"Earth 🌍",Libra:"Air 💨",Scorpio:"Water 🌊",Sagittarius:"Fire 🔥",Capricorn:"Earth 🌍",Aquarius:"Air 💨",Pisces:"Water 🌊" };
const signQuality  = { Aries:"Cardinal",Taurus:"Fixed",Gemini:"Mutable",Cancer:"Cardinal",Leo:"Fixed",Virgo:"Mutable",Libra:"Cardinal",Scorpio:"Fixed",Sagittarius:"Mutable",Capricorn:"Cardinal",Aquarius:"Fixed",Pisces:"Mutable" };
const signRuler    = { Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Pluto",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Uranus",Pisces:"Neptune" };

const cityCoordinates = {
  "New York"    :{ lat:40.7128,lon:-74.0060,tz:-4  },
  "London"      :{ lat:51.5074,lon:-0.1278, tz: 0  },
  "Paris"       :{ lat:48.8566,lon: 2.3522, tz: 1  },
  "Tokyo"       :{ lat:35.6762,lon:139.6503,tz: 9  },
  "Los Angeles" :{ lat:34.0522,lon:-118.2437,tz:-7 },
  "Sydney"      :{ lat:-33.8688,lon:151.2093,tz:10 },
  "Mumbai"      :{ lat:19.0760,lon:72.8777, tz: 5.5},
  "Cape Town"   :{ lat:-33.9249,lon:18.4241,tz: 2  },
  "Berlin"      :{ lat:52.5200,lon:13.4050, tz: 1  },
  "Mexico City" :{ lat:19.4326,lon:-99.1332,tz:-5  },
  "Dubai"       :{ lat:25.2048,lon:55.2708, tz: 4  },
  "Rome"        :{ lat:41.9028,lon:12.4964, tz: 1  },
  "Toronto"     :{ lat:43.6532,lon:-79.3832,tz:-4  },
  "Singapore"   :{ lat:1.3521, lon:103.8198,tz: 8  },
  "Istanbul"    :{ lat:41.0082,lon:28.9784, tz: 3  }
};

// ── MATH HELPERS ───────────────────────────────
const normalizeAngle = a => ((a % 360) + 360) % 360;
const toRad  = d => d * Math.PI / 180;
const toDeg  = r => r * 180 / Math.PI;

function resolveCity(t) {
  const n = t.trim().toLowerCase();
  for (const k in cityCoordinates) {
    if (k.toLowerCase() === n) return cityCoordinates[k];
  }
  return null;
}

function getJulianDay(year, month, day, hour, min) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return jd + (hour + min / 60) / 24 - 0.5;
}

function getSunLong(jd) {
  const n = jd - 2451545;
  const L = normalizeAngle(280.460 + 0.9856474 * n);
  const g = normalizeAngle(357.528 + 0.9856003 * n);
  return normalizeAngle(L + 1.915 * Math.sin(toRad(g)) + 0.020 * Math.sin(toRad(2 * g)));
}

function getMoonLong(jd) {
  const n  = jd - 2451545;
  const L  = normalizeAngle(218.316 + 13.176396 * n);
  const M  = normalizeAngle(134.963 + 13.064993 * n);
  const sl = getSunLong(jd);
  return normalizeAngle(L + 6.289 * Math.sin(toRad(M)) - 1.274 * Math.sin(toRad(2 * (L - sl) - M)) + 0.658 * Math.sin(toRad(2 * (L - sl))));
}

function getLST(jd, lon) {
  const T = (jd - 2451545) / 36525;
  return normalizeAngle(280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T * T - (T * T * T) / 38710000 + lon);
}

function getAsc(jd, lat, lon) {
  const eps  = 23.439291 - 0.0130042 * ((jd - 2451545) / 36525);
  const lst  = getLST(jd, lon);
  const tanL = Math.tan(toRad(lat));
  const ascR = Math.atan2(Math.sin(toRad(lst)) * Math.cos(toRad(eps)) - tanL * Math.sin(toRad(eps)), Math.cos(toRad(lst)));
  return normalizeAngle(toDeg(ascR));
}

function getAstroData(dateString, timeString, cityString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, min] = (timeString || "12:00").split(':').map(Number);
  const city = resolveCity(cityString) || {};
  const tz  = city.tz  !== undefined ? city.tz  : -new Date().getTimezoneOffset() / 60;
  const lon = city.lon !== undefined ? city.lon : 0;
  const lat = city.lat !== undefined ? city.lat : 0;
  const jd  = getJulianDay(year, month, day, hour - tz, min);
  const sunL = getSunLong(jd);
  const moonL = getMoonLong(jd);
  const ascL  = getAsc(jd, lat, lon);
  const si = Math.floor(sunL / 30) % 12;
  const mi = Math.floor(moonL / 30) % 12;
  const ai = Math.floor(ascL / 30) % 12;
  return {
    sunSign: zodiacSigns[si], sunDegree: sunL % 30, sunIndex: si,
    moonSign: zodiacSigns[mi], moonDegree: moonL % 30, moonIndex: mi,
    ascSign: zodiacSigns[ai], ascDegree: ascL % 30, ascIndex: ai,
    location: cityString || "Unknown",
    element: signElement[zodiacSigns[si]],
    quality: signQuality[zodiacSigns[si]],
    ruler: signRuler[zodiacSigns[si]]
  };
}

function getPlanetPositions(chart) {
  const base = chart.sunIndex * 30 + chart.sunDegree;
  const offsets = { Sun:0, Moon:chart.moonIndex*30+chart.moonDegree-base, Mercury:17, Venus:43, Mars:72, Jupiter:116, Saturn:154 };
  const colors  = { Sun:'rgba(255,193,7,0.9)', Moon:'rgba(66,133,244,0.9)', Mercury:'rgba(160,160,160,0.9)', Venus:'rgba(255,105,180,0.9)', Mars:'rgba(255,69,0,0.9)', Jupiter:'rgba(0,160,255,0.9)', Saturn:'rgba(200,200,200,0.9)' };
  return Object.entries(offsets).map(([name, off]) => {
    const angle = normalizeAngle(base + off);
    return { name, angle, color: colors[name], sign: zodiacSigns[Math.floor(angle / 30) % 12], degree: angle % 30, house: Math.floor(angle / 30) + 1 };
  });
}

// ── PERSONALITY TEXTS ──────────────────────────
const sunP = { Aries:"bold, adventurous, and ready to take the lead.", Taurus:"steady, grounded, and deeply attuned to comfort and beauty.", Gemini:"curious, expressive, and always seeking new ideas.", Cancer:"sensitive, nurturing, and emotionally attuned.", Leo:"confident, generous, and radiant in creative energy.", Virgo:"detail-oriented, practical, and deeply responsible.", Libra:"charming, balance-seeking, and relationship-focused.", Scorpio:"intense, magnetic, and powerfully transformative.", Sagittarius:"optimistic, free-spirited, and philosophical.", Capricorn:"disciplined, ambitious, and grounded in responsibility.", Aquarius:"visionary, independent, and always ahead of the curve.", Pisces:"compassionate, intuitive, and connected to the unseen." };
const moonP = { Aries:"you feel things quickly and act impulsively on strong emotions.", Taurus:"you crave comfort and emotional security in very physical ways.", Gemini:"your feelings are expressed with curiosity and mental agility.", Cancer:"you process emotion through deep care and the desire to protect loved ones.", Leo:"you take emotional pride in your warmth and generous spirit.", Virgo:"you refine your feelings by seeking meaning and practical solutions.", Libra:"you seek harmony in your inner world and through relationships.", Scorpio:"you feel intensely and transform through emotional honesty.", Sagittarius:"you want emotional freedom and meaning through adventure.", Capricorn:"you manage emotions with careful, grounded structure.", Aquarius:"you observe feelings from a wider intellectual perspective.", Pisces:"your emotional life is rich, dreamy, and deeply empathetic." };
const ascP  = { Aries:"direct, courageous, and quick to take initiative.", Taurus:"solid, grounded, and comfortable in your own rhythm.", Gemini:"communicative, versatile, and social in first impressions.", Cancer:"gentle, protective, and nurturing in how you show up.", Leo:"warm, confident, and naturally magnetic to those around you.", Virgo:"careful, modest, and attentive to every detail you present.", Libra:"graceful, diplomatic, and deeply concerned with balance.", Scorpio:"mysterious, intense, and powerfully magnetic at first glance.", Sagittarius:"optimistic, friendly, and adventurous in your appearance.", Capricorn:"steady, responsible, and serious in how you present yourself.", Aquarius:"original, thoughtful, and refreshingly independent.", Pisces:"sensitive, artistic, and dreamy in the impression you give." };

function getPersonalReading(c) {
  return `As a ${c.sunSign} Sun, you are ${sunP[c.sunSign]} With your Moon in ${c.moonSign}, ${moonP[c.moonSign]} Your ${c.ascSign} Ascendant means you appear ${ascP[c.ascSign]}`;
}

// ── DRAW WHEEL ─────────────────────────────────
function drawWheel(chart = {}) {
  const canvas = document.getElementById('chartCanvas');
  const ctx = canvas.getContext('2d');
  const cx = 140, cy = 140, r = 128;
  ctx.clearRect(0, 0, 280, 280);

  // White fill
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff'; ctx.fill();

  // Outer ring gold
  ctx.strokeStyle = 'rgba(212,175,55,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();

  // Inner ring
  ctx.beginPath(); ctx.arc(cx, cy, r - 20, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(212,175,55,0.15)'; ctx.lineWidth = 1; ctx.stroke();

  // 12 house lines
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx + (r - 20) * Math.cos(a), cy + (r - 20) * Math.sin(a));
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    ctx.strokeStyle = 'rgba(212,175,55,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    // faint spokes to centre
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (r - 20) * Math.cos(a), cy + (r - 20) * Math.sin(a));
    ctx.strokeStyle = 'rgba(212,175,55,0.08)'; ctx.lineWidth = 1; ctx.stroke();
  }

  // Planet dots
  const planets = chart.sunIndex != null ? getPlanetPositions(chart) : [];
  planets.forEach(p => {
    const rad = (p.angle - 90) * Math.PI / 180;
    const px  = cx + (r - 30) * Math.cos(rad);
    const py  = cy + (r - 30) * Math.sin(rad);
    ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  });

  // Centre dot
  ctx.beginPath(); ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255,0,0,0.35)'; ctx.fill();
}

function drawSkyMap(chart) {
  const el = document.getElementById('skyMapContainer');
  const planets = getPlanetPositions(chart);
  el.innerHTML = `<div class="chart-hub">☽ Sky Map</div>
    <div class="chart-grid" style="grid-template-columns:1fr;gap:8px;">
      ${planets.map(p => `<div class="chart-item">${p.name}<span>${p.sign} ${p.degree.toFixed(1)}° · House ${p.house}</span></div>`).join('')}
    </div>`;
  return planets;
}

// ── DAILY HOROSCOPE ────────────────────────────
const horoscopeThemes = {
  Aries:      { love:72, career:85, energy:90, luck:68, luckyNum:"7",  luckyColor:"Red",     luckyDay:"Tuesday"  },
  Taurus:     { love:88, career:70, energy:62, luck:79, luckyNum:"6",  luckyColor:"Green",   luckyDay:"Friday"   },
  Gemini:     { love:65, career:80, energy:88, luck:73, luckyNum:"5",  luckyColor:"Yellow",  luckyDay:"Wednesday"},
  Cancer:     { love:91, career:65, energy:58, luck:82, luckyNum:"2",  luckyColor:"Silver",  luckyDay:"Monday"   },
  Leo:        { love:78, career:92, energy:95, luck:84, luckyNum:"1",  luckyColor:"Gold",    luckyDay:"Sunday"   },
  Virgo:      { love:60, career:88, energy:70, luck:66, luckyNum:"5",  luckyColor:"Navy",    luckyDay:"Wednesday"},
  Libra:      { love:85, career:74, energy:66, luck:80, luckyNum:"6",  luckyColor:"Pink",    luckyDay:"Friday"   },
  Scorpio:    { love:80, career:78, energy:82, luck:76, luckyNum:"9",  luckyColor:"Crimson", luckyDay:"Tuesday"  },
  Sagittarius:{ love:74, career:83, energy:92, luck:88, luckyNum:"3",  luckyColor:"Purple",  luckyDay:"Thursday" },
  Capricorn:  { love:58, career:95, energy:68, luck:72, luckyNum:"8",  luckyColor:"Brown",   luckyDay:"Saturday" },
  Aquarius:   { love:70, career:82, energy:85, luck:77, luckyNum:"11", luckyColor:"Electric Blue", luckyDay:"Saturday" },
  Pisces:     { love:93, career:62, energy:55, luck:85, luckyNum:"7",  luckyColor:"Sea Green",luckyDay:"Thursday" }
};

const horoscopeTexts = {
  Aries:       "The ram charges forward today with renewed fire. Mars fuels your ambition, clearing obstacles. A bold conversation could open unexpected doors. Trust your instinct — hesitation is not in your stars today.",
  Taurus:      "Venus wraps you in gentle abundance. A financial opportunity whispers at the edges — stay receptive. Your steadfast nature is your greatest asset; someone notices your quiet reliability today.",
  Gemini:      "Mercury sparks your wit into overdrive. Ideas flow easily — capture them before they flutter away. A chance encounter may become significant. Don't overthink; your first impression is the right one.",
  Cancer:      "The Moon illuminates your emotional depths. A matter you have been carrying privately is ready to be released. Nurture yourself first today. The right person is watching out for you.",
  Leo:         "The Sun blazes in your corner. Creative projects reach a breakthrough point. Your warmth draws admiration — use it wisely. A leadership moment arrives; step into it without apology.",
  Virgo:       "Mercury sharpens your analytical mind. A complex problem reveals its solution through careful observation. Don't dismiss small details — one holds the key. Your service to others returns in kind.",
  Libra:       "Venus whispers of harmony restored. A relationship that felt strained finds its balance. Aesthetic inspiration strikes — follow it. Diplomacy is your superpower; wield it gracefully today.",
  Scorpio:     "Pluto stirs transformation beneath the surface. Something you thought was over may resurface with new meaning. Trust your penetrating intuition over surface appearances. Power lies in what you choose not to say.",
  Sagittarius: "Jupiter expands your horizon today. A philosophical insight changes how you see a situation. Adventure beckons — even small ones count. The universe rewards your boldness with unexpected guidance.",
  Capricorn:   "Saturn rewards your discipline today. The groundwork you have laid begins to show its return. Recognition arrives quietly but sincerely. Take pride in how far you have climbed.",
  Aquarius:    "Uranus sparks your originality. A revolutionary idea is within reach — don't dismiss it as too unusual. Your detached perspective sees what others miss. Connection comes from your authentic uniqueness.",
  Pisces:      "Neptune deepens your intuitive gifts today. A dream or feeling holds a message worth examining. Compassion opens a door that logic cannot. Trust the unseen current guiding you."
};

function getTodaySign() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  if ((m===3&&d>=21)||(m===4&&d<=19)) return "Aries";
  if ((m===4&&d>=20)||(m===5&&d<=20)) return "Taurus";
  if ((m===5&&d>=21)||(m===6&&d<=20)) return "Gemini";
  if ((m===6&&d>=21)||(m===7&&d<=22)) return "Cancer";
  if ((m===7&&d>=23)||(m===8&&d<=22)) return "Leo";
  if ((m===8&&d>=23)||(m===9&&d<=22)) return "Virgo";
  if ((m===9&&d>=23)||(m===10&&d<=22)) return "Libra";
  if ((m===10&&d>=23)||(m===11&&d<=21)) return "Scorpio";
  if ((m===11&&d>=22)||(m===12&&d<=21)) return "Sagittarius";
  if ((m===12&&d>=22)||(m===1&&d<=19)) return "Capricorn";
  if ((m===1&&d>=20)||(m===2&&d<=18)) return "Aquarius";
  return "Pisces";
}

function showDailyHoroscope() {
  let sign = userData.sunSign || getTodaySign();
  const theme = horoscopeThemes[sign];
  const text  = horoscopeTexts[sign];
  const now   = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  document.getElementById('horoscope-content').innerHTML = `
    <div class="horoscope-date-badge">📅 ${dateStr}</div>
    <div class="horoscope-sign-display">${zodiacEmoji[sign]}</div>
    <div class="horoscope-sign-name">${sign}</div>
    <p style="font-size:0.85rem;color:var(--text-muted);font-style:italic;margin:6px 0 16px;">${signElement[sign]} · ${signQuality[sign]} · Ruled by ${signRuler[sign]}</p>

    <div class="horoscope-energy-bar">
      <div class="energy-row">
        <span class="energy-label">Love</span>
        <div class="energy-track"><div class="energy-fill" style="width:${theme.love}%"></div></div>
        <span class="energy-val">${theme.love}%</span>
      </div>
      <div class="energy-row">
        <span class="energy-label">Career</span>
        <div class="energy-track"><div class="energy-fill" style="width:${theme.career}%"></div></div>
        <span class="energy-val">${theme.career}%</span>
      </div>
      <div class="energy-row">
        <span class="energy-label">Energy</span>
        <div class="energy-track"><div class="energy-fill" style="width:${theme.energy}%"></div></div>
        <span class="energy-val">${theme.energy}%</span>
      </div>
      <div class="energy-row">
        <span class="energy-label">Luck</span>
        <div class="energy-track"><div class="energy-fill" style="width:${theme.luck}%"></div></div>
        <span class="energy-val">${theme.luck}%</span>
      </div>
    </div>

    <div class="horoscope-text-box">${text}</div>

    <div class="horoscope-lucky">
      <div class="lucky-item"><div class="lucky-label">Lucky Number</div><div class="lucky-val">${theme.luckyNum}</div></div>
      <div class="lucky-item"><div class="lucky-label">Lucky Color</div><div class="lucky-val">${theme.luckyColor}</div></div>
      <div class="lucky-item"><div class="lucky-label">Best Day</div><div class="lucky-val">${theme.luckyDay}</div></div>
    </div>
  `;

  showScreen('screen-horoscope');

  // AI enhancement
  callOracleAI(`Give a concise, personal daily horoscope (3 sentences) for ${sign} for today. Include one specific area to focus on and a short affirmation. Be warm, direct, and mystical.`)
    .then(r => {
      if (r && r.length > 40) {
        document.querySelector('.horoscope-text-box').innerHTML = r;
      }
    }).catch(() => {});
}

// ── COMPATIBILITY ───────────────────────────────
const compatMatrix = {
  "Aries":       { Aries:60,Taurus:55,Gemini:82,Cancer:50,Leo:90,Virgo:48,Libra:75,Scorpio:60,Sagittarius:88,Capricorn:52,Aquarius:78,Pisces:55 },
  "Taurus":      { Aries:55,Taurus:72,Gemini:50,Cancer:88,Leo:65,Virgo:90,Libra:60,Scorpio:82,Sagittarius:48,Capricorn:92,Aquarius:52,Pisces:78 },
  "Gemini":      { Aries:82,Taurus:50,Gemini:68,Cancer:52,Leo:78,Virgo:60,Libra:90,Scorpio:48,Sagittarius:85,Capricorn:50,Aquarius:88,Pisces:62 },
  "Cancer":      { Aries:50,Taurus:88,Gemini:52,Cancer:72,Leo:60,Virgo:78,Libra:55,Scorpio:90,Sagittarius:50,Capricorn:75,Aquarius:48,Pisces:92 },
  "Leo":         { Aries:90,Taurus:65,Gemini:78,Cancer:60,Leo:70,Virgo:55,Libra:82,Scorpio:58,Sagittarius:90,Capricorn:52,Aquarius:72,Pisces:60 },
  "Virgo":       { Aries:48,Taurus:90,Gemini:60,Cancer:78,Leo:55,Virgo:70,Libra:60,Scorpio:80,Sagittarius:50,Capricorn:88,Aquarius:62,Pisces:80 },
  "Libra":       { Aries:75,Taurus:60,Gemini:90,Cancer:55,Leo:82,Virgo:60,Libra:68,Scorpio:58,Sagittarius:80,Capricorn:55,Aquarius:88,Pisces:65 },
  "Scorpio":     { Aries:60,Taurus:82,Gemini:48,Cancer:90,Leo:58,Virgo:80,Libra:58,Scorpio:72,Sagittarius:52,Capricorn:80,Aquarius:50,Pisces:90 },
  "Sagittarius": { Aries:88,Taurus:48,Gemini:85,Cancer:50,Leo:90,Virgo:50,Libra:80,Scorpio:52,Sagittarius:72,Capricorn:55,Aquarius:85,Pisces:62 },
  "Capricorn":   { Aries:52,Taurus:92,Gemini:50,Cancer:75,Leo:52,Virgo:88,Libra:55,Scorpio:80,Sagittarius:55,Capricorn:75,Aquarius:62,Pisces:78 },
  "Aquarius":    { Aries:78,Taurus:52,Gemini:88,Cancer:48,Leo:72,Virgo:62,Libra:88,Scorpio:50,Sagittarius:85,Capricorn:62,Aquarius:70,Pisces:60 },
  "Pisces":      { Aries:55,Taurus:78,Gemini:62,Cancer:92,Leo:60,Virgo:80,Libra:65,Scorpio:90,Sagittarius:62,Capricorn:78,Aquarius:60,Pisces:75 }
};

const compatDescriptions = {
  high:   "The stars align beautifully for this pairing. Your energies complement each other in a rare and meaningful way — this connection has real depth and lasting potential.",
  medium: "This pairing carries both spark and challenge. Growth is possible here if both partners are willing to understand each other's differences. The friction can become fuel.",
  low:    "The cosmos presents friction between these signs. Not impossible — but requiring conscious effort, patience, and willingness to grow beyond comfort zones."
};

const aspectNames = ["Emotional", "Communication", "Passion", "Long-term", "Spiritual"];

function getCompatSign(id) {
  const val = document.getElementById(id).value;
  return val || zodiacSigns[Math.floor(Math.random() * 12)];
}

function showCompatibility() {
  const sign1 = document.getElementById('compat-sign1').value;
  const sign2 = document.getElementById('compat-sign2').value;
  const name1 = document.getElementById('compat-name1').value || "Person 1";
  const name2 = document.getElementById('compat-name2').value || "Person 2";

  if (!sign1 || !sign2) return alert("Please select both signs.");

  const score = compatMatrix[sign1]?.[sign2] || 65;
  const level = score >= 80 ? "high" : score >= 60 ? "medium" : "low";
  const desc  = compatDescriptions[level];
  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? 'var(--gold)' : '#ef4444';

  // Generate per-aspect scores based on main score
  const aspects = aspectNames.map(name => {
    const variation = Math.floor(Math.random() * 24) - 12;
    const s = Math.min(100, Math.max(30, score + variation));
    const stars = s >= 80 ? '★★★★★' : s >= 65 ? '★★★★☆' : s >= 50 ? '★★★☆☆' : '★★☆☆☆';
    return { name, stars };
  });

  document.getElementById('compat-result-area').innerHTML = `
    <div class="compat-result">
      <div class="compat-score" style="color:${scoreColor}">${score}%</div>
      <div class="compat-score-label">Compatibility Score</div>
      <div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:14px;">${zodiacEmoji[sign1]} ${sign1} &nbsp;+&nbsp; ${zodiacEmoji[sign2]} ${sign2}</div>
      <div class="compat-aspects">
        ${aspects.map(a => `<div class="compat-aspect-row"><span class="compat-aspect-name">${a.name}</span><span class="compat-stars">${a.stars}</span></div>`).join('')}
      </div>
      <p class="compat-text">${desc}</p>
    </div>
  `;

  callOracleAI(`Give a 3-sentence compatibility reading for ${sign1} and ${sign2} (named ${name1} and ${name2}). Be warm, specific to these signs, and end with a short piece of advice for this pairing.`)
    .then(r => {
      if (r && r.length > 40) {
        document.querySelector('.compat-text').innerHTML = r;
      }
    }).catch(() => {});
}

// ── TAROT DECK ─────────────────────────────────
const tarotDeck = [
  { name:"The Fool",         img:"🃏", meaning:"New beginnings, optimism, and trust in life.",            advice:"A fresh start is coming. Don't be afraid to take a leap of faith.",          keywords:"beginnings · freedom · innocence",   wikimediaId:"RWS_Tarot_00_Fool" },
  { name:"The Magician",     img:"🪄", meaning:"Manifestation, power, and inspired action.",              advice:"You have all the tools you need to succeed right now.",                       keywords:"willpower · desire · creation",       wikimediaId:"RWS_Tarot_01_Magician" },
  { name:"The High Priestess",img:"🌑",meaning:"Intuition, mystery, and inner knowledge.",                advice:"Listen to your silence. The answers are within you.",                         keywords:"intuition · mystery · wisdom",        wikimediaId:"RWS_Tarot_02_High_Priestess" },
  { name:"The Empress",      img:"👑", meaning:"Abundance, creativity, and nurturing.",                   advice:"Something beautiful is growing. Nurture your ideas.",                         keywords:"fertility · nature · abundance",      wikimediaId:"RWS_Tarot_03_Empress" },
  { name:"The Emperor",      img:"🏛️", meaning:"Structure, stability, and authority.",                    advice:"Bring order to your chaos. Discipline is your friend today.",                 keywords:"authority · structure · control",     wikimediaId:"RWS_Tarot_04_Emperor" },
  { name:"The Hierophant",   img:"📜", meaning:"Tradition, spiritual wisdom, and learning.",              advice:"Seek guidance from a mentor or a proven system.",                             keywords:"tradition · conformity · morality",   wikimediaId:"RWS_Tarot_05_Hierophant" },
  { name:"The Lovers",       img:"❤️", meaning:"Harmony, relationships, and values alignment.",           advice:"Choose with your heart, but ensure it aligns with your soul.",                keywords:"love · harmony · choices",            wikimediaId:"RWS_Tarot_06_Lovers" },
  { name:"The Chariot",      img:"🏇", meaning:"Willpower, determination, and success.",                  advice:"Stay focused. You are in the driver's seat of your life.",                    keywords:"control · willpower · victory",       wikimediaId:"RWS_Tarot_07_Chariot" },
  { name:"Strength",         img:"🦁", meaning:"Courage, compassion, and inner power.",                   advice:"True strength is gentle. Use persuasion, not force.",                         keywords:"courage · patience · control",        wikimediaId:"RWS_Tarot_08_Strength" },
  { name:"The Hermit",       img:"🕯️", meaning:"Solitude, soul-searching, and reflection.",              advice:"Step back from the noise. It is time for introspection.",                     keywords:"introspection · solitude · guidance", wikimediaId:"RWS_Tarot_09_Hermit" },
  { name:"Wheel of Fortune", img:"🎡", meaning:"Change, destiny, and turning points.",                    advice:"The cycle is turning. Be ready for a sudden shift in luck.",                   keywords:"change · cycles · fate",              wikimediaId:"RWS_Tarot_10_Wheel_of_Fortune" },
  { name:"Justice",          img:"⚖️", meaning:"Fairness, truth, and cause and effect.",                 advice:"You will get what you deserve based on your past actions.",                    keywords:"justice · fairness · truth",          wikimediaId:"RWS_Tarot_11_Justice" },
  { name:"The Hanged Man",   img:"🙃", meaning:"Surrender, new perspective, and sacrifice.",              advice:"Let go of control. Try looking at the problem upside down.",                   keywords:"pause · surrender · letting go",       wikimediaId:"RWS_Tarot_12_Hanged_Man" },
  { name:"Death",            img:"💀", meaning:"Endings, transition, and transformation.",                advice:"Something must end so something new can begin.",                               keywords:"endings · change · transformation",   wikimediaId:"RWS_Tarot_13_Death" },
  { name:"Temperance",       img:"🍶", meaning:"Balance, patience, and purpose.",                         advice:"Avoid extremes. Find the middle path to success.",                             keywords:"balance · moderation · patience",     wikimediaId:"RWS_Tarot_14_Temperance" },
  { name:"The Devil",        img:"😈", meaning:"Shadow self, attachment, and addiction.",                 advice:"Break the chains you've placed on yourself. You are free.",                    keywords:"shadow · bondage · materialism",      wikimediaId:"RWS_Tarot_15_Devil" },
  { name:"The Tower",        img:"⚡", meaning:"Sudden upheaval, revelation, and chaos.",                 advice:"A false structure is falling to make room for the truth.",                     keywords:"upheaval · chaos · revelation",       wikimediaId:"RWS_Tarot_16_Tower" },
  { name:"The Star",         img:"🌟", meaning:"Hope, inspiration, and rejuvenation.",                    advice:"Keep your faith. The universe is guiding you toward healing.",                 keywords:"hope · faith · rejuvenation",         wikimediaId:"RWS_Tarot_17_Star" },
  { name:"The Moon",         img:"🌙", meaning:"Illusion, intuition, and the subconscious.",              advice:"Not everything is as it seems. Trust your gut over your eyes.",                keywords:"illusion · fear · subconscious",      wikimediaId:"RWS_Tarot_18_Moon" },
  { name:"The Sun",          img:"☀️", meaning:"Success, joy, and vitality.",                            advice:"Radiate your light! Success and happiness are yours.",                          keywords:"positivity · fun · warmth",           wikimediaId:"RWS_Tarot_19_Sun" },
  { name:"Judgement",        img:"🎺", meaning:"Awakening, renewal, and absolution.",                     advice:"It is time for a self-evaluation and a fresh start.",                          keywords:"reflection · reckoning · awakening",  wikimediaId:"RWS_Tarot_20_Judgement" },
  { name:"The World",        img:"🌍", meaning:"Completion, integration, and travel.",                    advice:"You have reached a milestone. Celebrate your success.",                        keywords:"completion · integration · accomplishment", wikimediaId:"RWS_Tarot_21_World" }
];

const spreadTypes = {
  yesno:   { context:"Yes/No Oracle",   prefix:"For your Yes/No question, pulling this card indicates " },
  love:    { context:"Love Spread",     prefix:"Regarding your love life, this card speaks of " },
  career:  { context:"Career Spread",   prefix:"For your professional journey, this card suggests " },
  general: { context:"General Reading", prefix:"The oracle reveals " }
};

function getCardImageUrl(card) {
  return `https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/${card.wikimediaId}.jpg/200px-${card.wikimediaId}.jpg`;
}

// ── SCREEN ROUTING ─────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function startApp() {
  loadMusic();
  showScreen('screen-form');
}

function saveProfile() {
  userData = {
    name:    document.getElementById('userName').value || "Seeker",
    date:    document.getElementById('birthDate').value,
    time:    document.getElementById('birthTime').value || "12:00",
    city:    document.getElementById('birthCity').value || "",
    sunSign: null
  };
  if (!userData.date) { alert("Please enter your birth date."); return; }

  // Calculate sun sign for horoscope
  const chart = getAstroData(userData.date, userData.time, userData.city);
  userData.sunSign = chart.sunSign;

  document.getElementById('welcomeText').innerText = `Greetings, ${userData.name}`;
  showScreen('screen-nav');
}

// ── BIRTH CHART ─────────────────────────────────
async function showChart() {
  const chart = getAstroData(userData.date, userData.time, userData.city);

  document.getElementById('chartDisplay').innerHTML = `
    <div class="chart-item">Sun Sign<span>${chart.sunSign}</span></div>
    <div class="chart-item">Sun °<span>${chart.sunDegree.toFixed(1)}°</span></div>
    <div class="chart-item">Element<span>${chart.element}</span></div>
    <div class="chart-item">Moon Sign<span>${chart.moonSign}</span></div>
    <div class="chart-item">Moon °<span>${chart.moonDegree.toFixed(1)}°</span></div>
    <div class="chart-item">Ascendant<span>${chart.ascSign}</span></div>
    <div class="chart-item">Rising °<span>${chart.ascDegree.toFixed(1)}°</span></div>
    <div class="chart-item">Quality<span>${chart.quality}</span></div>
    <div class="chart-item">Ruler<span>${chart.ruler}</span></div>
  `;
  document.getElementById('chartReading').innerHTML = `<strong>${userData.name}'s Reading:</strong><br><br>${getPersonalReading(chart)}`;
  drawWheel(chart);
  drawSkyMap(chart);
  showScreen('screen-chart');

  try {
    const r = await callOracleAI(`Give a warm astrological reading (4 sentences) for Sun in ${chart.sunSign}, Moon in ${chart.moonSign}, Ascendant in ${chart.ascSign}. Focus on personality, life path, and one specific strength.`);
    if (r && r.length > 40) document.getElementById('chartReading').innerHTML = `<strong>${userData.name}'s Cosmic Reading</strong><br><br>${r}`;
  } catch(e) { console.warn('AI chart', e); }
}

// ── TAROT DRAW ──────────────────────────────────
function startDraw() {
  const spread = document.getElementById('spreadType').value;
  const q      = document.getElementById('userQuestion').value;
  document.getElementById('drawContext').innerText = `${spreadTypes[spread].context}${q ? ' — ' + q : ''}`;
  const cardEl = document.getElementById('tarotCard');
  cardEl.classList.remove('is-drawn','is-flipped');
  document.getElementById('detailedReading').style.display = 'none';
  showScreen('screen-tarot-draw');
  setTimeout(() => cardEl.classList.add('is-drawn'), 300);
}

function flipCard() {
  const cardEl = document.getElementById('tarotCard');
  if (cardEl.classList.contains('is-flipped')) return;

  const spread  = document.getElementById('spreadType').value;
  const card    = tarotDeck[Math.floor(Math.random() * tarotDeck.length)];
  const isRev   = Math.random() < 0.3;
  const q       = document.getElementById('userQuestion').value || "a general intention";
  let   yesNo   = '';
  if (spread === 'yesno') yesNo = Math.random() > 0.4 ? "<strong style='color:#16a34a'>YES.</strong> " : "<strong style='color:#ef4444'>NO.</strong> ";

  // Card front with image
  const imgUrl = getCardImageUrl(card);
  document.getElementById('cardResult').innerHTML = `
    ${isRev ? '<div class="card-reversed-badge">↻ Reversed</div>' : ''}
    <div class="card-name-text">${card.name}</div>
    <div class="card-keywords">${card.keywords}</div>
    <img class="card-art-img" src="${imgUrl}" alt="${card.name}"
         onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
         style="transform:${isRev?'rotate(180deg)':'none'}">
    <div class="card-art-placeholder" style="display:none;">${card.img}</div>
    <div class="card-meaning-box">${isRev ? (card.reversedMeaning || 'A reversed energy invites careful reflection.') : card.meaning}</div>
  `;

  const d = document.getElementById('detailedReading');
  d.style.display = 'block';
  d.innerHTML = `
    <strong>Your Reading</strong>
    <p>${yesNo}${spreadTypes[spread].prefix}${isRev ? (card.reversedMeaning || card.meaning + ' This reversed placement asks you to reconsider the shadow side.') : card.meaning}</p>
    <hr>
    <strong>Concrete Action</strong>
    <p>${isRev ? (card.reversedAdvice || card.advice + ' Reflect inward before acting.') : card.advice}</p>
  `;

  cardEl.classList.add('is-flipped');

  callOracleAI(`You are an expert tarot reader. Question: '${q}'. Card drawn: ${card.name}${isRev?' reversed':''}. Spread: ${spread}. Give a compassionate 3-sentence reading with practical guidance.`)
    .then(r => {
      if (r && r.length > 30) d.innerHTML = `<strong>Your Reading</strong><p>${r}</p><hr><strong>Concrete Action</strong><p>${isRev ? (card.reversedAdvice || card.advice + ' Reflect inward.') : card.advice}</p>`;
    }).catch(e => console.warn('AI tarot', e));
}

// ── CLAUDE AI ───────────────────────────────────
async function callOracleAI(userPrompt, systemPrompt) {
  const sys = systemPrompt || "You are Oracle Sandi, a wise and compassionate tarot reader and astrologer. Speak with warmth, mysticism, and grounded clarity. Keep responses under 120 words but deeply meaningful. Give real, personal-feeling guidance — not vague platitudes. End with a short empowering phrase.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: sys,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  const data = await res.json();
  if (data.content && data.content[0]) return data.content[0].text;
  throw new Error("No AI response");
}

// ── CHAT ────────────────────────────────────────
function openChat()  { document.getElementById('chatOverlay').classList.add('active'); loadMusic(); }
function closeChat() { document.getElementById('chatOverlay').classList.remove('active'); }

function setSpread(el, spread) {
  document.querySelectorAll('.spread-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentSpread = spread;
}

function useSuggestion(el) {
  document.getElementById('chatInput').value = el.textContent.trim();
  document.getElementById('suggestionPills').style.display = 'none';
  sendMessage();
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function escapeHtml(t) {
  return t.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}

function addMessage(role, text, card) {
  const container = document.getElementById('chatMessages');
  const isUser    = role === 'user';
  const cardHtml  = card ? `
    <div class="chat-card">
      <div class="chat-card-glyph">${card.img}</div>
      <div class="chat-card-details">
        <div class="chat-card-name">${card.name}${card.reversed ? ' (Reversed)' : ''}</div>
        <div class="chat-card-orient">${card.reversed ? '↻ Reversed' : '↑ Upright'}</div>
        <div class="chat-card-kw">${card.keywords}</div>
      </div>
    </div>` : '';

  container.innerHTML += `
    <div class="msg-row${isUser ? ' user-row' : ''}">
      <div class="msg-av ${isUser ? 'user-av' : 'oracle-av'}">${isUser ? '🌙' : '🔮'}</div>
      <div class="msg-wrap">
        <div class="msg-name">${isUser ? (userData.name || 'You') : 'Oracle Sandi'}</div>
        <div class="msg-bubble ${isUser ? 'user-bubble' : 'oracle-bubble'}">${escapeHtml(text)}</div>
        ${cardHtml}
      </div>
    </div>`;
  container.scrollTop = container.scrollHeight;
}

function addTyping() {
  const c  = document.getElementById('chatMessages');
  const id = 'typing-' + Date.now();
  c.innerHTML += `
    <div id="${id}" class="msg-row">
      <div class="msg-av oracle-av">🔮</div>
      <div class="msg-wrap">
        <div class="msg-name">Oracle Sandi</div>
        <div class="msg-bubble oracle-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
      </div>
    </div>`;
  c.scrollTop = c.scrollHeight;
  return id;
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const query = input.value.trim();
  if (!query) return;

  document.getElementById('suggestionPills').style.display = 'none';
  addMessage('user', query);
  input.value = '';
  input.style.height = 'auto';
  chatHistory.push({ role:'user', content: query });

  const typingId = addTyping();

  const card    = tarotDeck[Math.floor(Math.random() * tarotDeck.length)];
  const isRev   = Math.random() < 0.3;
  const drawnCard = { ...card, reversed: isRev };

  const spreadCtx = { general:"a general life reading", love:"a love and relationship reading", career:"a career and purpose reading", yesno:"a yes/no oracle reading" }[currentSpread];
  const sys = `You are Oracle Sandi, a warm, wise, intuitive tarot reader. The seeker has chosen ${spreadCtx}. You have just drawn: ${card.name}${isRev?' (Reversed)':''}. Its meaning: ${isRev?(card.reversedMeaning||'reversed energy of: '+card.meaning):card.meaning}. Weave this card naturally into your reading of the seeker's question. Be direct, warm, and personal. Give grounded advice. Keep response under 130 words. End with a short empowering closing phrase.`;

  try {
    const reply = await callOracleAI(query, sys);
    document.getElementById(typingId)?.remove();
    addMessage('oracle', reply, drawnCard);
    chatHistory.push({ role:'assistant', content: reply });
  } catch(e) {
    document.getElementById(typingId)?.remove();
    addMessage('oracle', localTarotFallback(query, card, isRev), drawnCard);
  }
}

function localTarotFallback(query, card, isRev) {
  const low   = query.toLowerCase();
  const isLove   = /(love|date|relationship|partner|crush|romance|heart)/i.test(low);
  const isCareer = /(career|job|work|boss|business|money|success)/i.test(low);
  const isYesNo  = /\b(should i|can i|will i|is it|do i|am i)\b/i.test(low);
  const base = `The oracle draws ${card.name}${isRev?' reversed':''} — ${isRev?'a call to look inward before acting.':'a powerful sign for you today.'}`;
  if (isLove)   return `${base} In matters of the heart, align emotions with honest boundaries. Love that is real will meet you where you are.`;
  if (isCareer) return `${base} Momentum is building professionally. Trust the direction that feels aligned with your purpose and act with quiet confidence.`;
  if (isYesNo)  return `${base} ${Math.random() > 0.45 ? 'The energy leans YES — proceed with awareness.' : 'The card counsels patience. Not yet — something better is forming.'}`;
  return `${base} ${card.advice} Claim this energy and move with intention.`;
}

// ── MUSIC ────────────────────────────────────────
function loadMusic() {
  if (musicLoaded) return;
  const c = document.getElementById('youtubeAudioContainer');
  c.innerHTML = `<audio id="bgMusic" loop>
      <source src="music.mp3" type="audio/mpeg">
      Your browser does not support the audio element.
    </audio>`;
  musicLoaded  = true;
  musicPlaying = false;
  updateMusicFab();
}

function toggleMusic() {
  if (!musicLoaded) loadMusic();
  const audio = document.getElementById('bgMusic');
  if (!audio) return;

  if (musicPlaying) {
    audio.pause();
    musicPlaying = false;
  } else {
    audio.play().catch(() => {
      // Browser blocked autoplay, user can click again to allow sound.
    });
    musicPlaying = true;
  }

  updateMusicFab();
}

function updateMusicFab() {
  const fab = document.getElementById('musicFab');
  if (!fab) return;
  fab.textContent = musicPlaying ? '🔊' : '🔇';
  fab.title       = musicPlaying ? 'Pause music' : 'Play music';
  if (musicPlaying) fab.classList.add('playing');
  else              fab.classList.remove('playing');
}

// ── ABOUT MODAL ──────────────────────────────────
function openAbout()  { document.getElementById('aboutModal').classList.add('active'); }
function closeAbout() { document.getElementById('aboutModal').classList.remove('active'); }

// ── KEYBOARD SHORTCUTS ───────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && document.activeElement.id === 'chatInput') {
    e.preventDefault();
    sendMessage();
  }
  if (e.key === 'Escape') {
    closeChat();
    closeAbout();
  }
});

// Close modals on backdrop click
document.getElementById('chatOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('chatOverlay')) closeChat();
});
document.getElementById('aboutModal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('aboutModal')) closeAbout();
});

// Populate sign selects for compatibility
function populateSignSelects() {
  ['compat-sign1','compat-sign2'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    zodiacSigns.forEach(sign => {
      const o = document.createElement('option');
      o.value = sign;
      o.textContent = `${zodiacEmoji[sign]} ${sign}`;
      sel.appendChild(o);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  populateSignSelects();
});