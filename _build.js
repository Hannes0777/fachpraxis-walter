// Setzt die Inhalte aus content/*.json (werden im CMS unter /admin gepflegt) in die HTML-Seiten ein.
// Arbeitet direkt auf den vorhandenen Dateien: nur Bereiche zwischen <!--cms:name--> ... <!--/cms:name-->
// werden ersetzt, alles andere bleibt unangetastet. Mehrfaches Ausführen ergibt dasselbe Ergebnis.
// Aufruf: node _build.js   (Cloudflare Pages: Build-Befehl "node _build.js", Ausgabeverzeichnis ".")
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const J = n => JSON.parse(rd('content/' + n + '.json'));

const esc = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PAGES = ['index', 'leistungen', 'praxis', 'kontakt', 'anfrage', 'impressum', 'datenschutz'].map(f => f + '.html');

const K = J('kontakt'), Z = J('zeiten'), H = J('hinweis'), P = J('preise'), F = J('formulare').formulare || [];

// ---------- Zeiten ----------
const DAYS = [['mo', 'Mo'], ['di', 'Di'], ['mi', 'Mi'], ['do', 'Do'], ['fr', 'Fr']];
// "10-13, 14-18:30" -> [[10,13],[14,18.5]]
function parse(str) {
  const out = [];
  String(str || '').split(/[,;·\/]|\bund\b/).forEach(part => {
    const m = part.match(/(\d{1,2})(?::(\d{2}))?\s*[-–—bis]+\s*(\d{1,2})(?::(\d{2}))?/);
    if (!m) return;
    const a = +m[1] + (m[2] ? +m[2] / 60 : 0), b = +m[3] + (m[4] ? +m[4] / 60 : 0);
    if (b > a && b <= 24) out.push([a, b]);
  });
  return out;
}
const hm = x => { const h = Math.floor(x), m = Math.round((x - h) * 60); return m ? h + ':' + String(m).padStart(2, '0') : String(h); };
const fmt = slots => slots.map(s => hm(s[0]) + '–' + hm(s[1])).join(' · ') + ' Uhr';
const rows = block => DAYS.map(([k, l]) => ({ k, l, slots: parse((block || {})[k]) }));
const therapie = rows(Z.therapie), telefon = rows(Z.telefon);

const hoursRows = therapie.map((r, i) =>
  `\n              <tr data-d="${i + 1}"><td>${r.l}</td>${r.slots.length ? '<td>' + fmt(r.slots) : '<td class="off">geschlossen'}</td></tr>`).join('') +
  `\n              <tr data-d="6"><td>Sa, So</td><td class="off">geschlossen</td></tr>\n            `;
const telRows = telefon.map(r =>
  `\n              <tr><td>${r.l}</td><td>${r.slots.length ? fmt(r.slots) : 'geschlossen'}</td></tr>`).join('') + '\n            ';

// Fußzeile: aufeinanderfolgende gleiche Tage zusammenfassen (Mi, Do)
function footHours() {
  const groups = [];
  therapie.forEach((r, i) => {
    if (!r.slots.length) return;
    const t = fmt(r.slots), last = groups[groups.length - 1];
    if (last && last.t === t && last.idx === i - 1) { last.days.push(r.l); last.idx = i; }
    else groups.push({ t, days: [r.l], idx: i });
  });
  return groups.map(g => g.days.join(', ') + ' ' + g.t).join('<br>');
}
const plainHours = () => therapie.map(r => `${r.l} ${r.slots.length ? fmt(r.slots) : 'geschlossen'}`).join(' ') + ' Sa, So geschlossen';

// JS-Zeitfenster für "Jetzt geöffnet"
const slotsJs = 'var slots={' + [1, 2, 3, 4, 5].map((d, i) => d + ':' + JSON.stringify(therapie[i].slots)).join(',') + ',6:[],0:[]};';

// ---------- Hinweis ----------
const hinweis = (H.aktiv && (H.text || H.titel))
  ? `\n<div class="hinweis" role="status"><div class="wrap">${H.titel ? '<b>' + esc(H.titel) + '</b>' : ''}<span>${esc(H.text)}</span></div></div>\n`
  : '';

// ---------- Preise ----------
const preise =
  `\n          <dt>10er-Karte</dt><dd><strong>${esc(P.zehnerkarte)}</strong></dd>` +
  `\n          <dt>Einmalige Anwendung</dt><dd><strong>${esc(P.einzeln)}</strong></dd>` +
  `\n          <dt>Dauer</dt><dd>${esc(P.dauer)}</dd>` +
  `\n          <dt>Häufigkeit</dt><dd>${esc(P.haeufigkeit)}</dd>\n        `;

// ---------- Formulare ----------
const link = (f, text) => `<a href="${esc(f.datei)}" target="_blank" rel="noopener">${esc(text)}`;
const formulareFull = (ind) => '\n' + F.map(f => `${ind}<li>${link(f, f.titel)}</a><small>PDF</small></li>`).join('\n') + '\n' + ind.slice(2);
const formulareFoot = F.filter(f => f.fusszeile).map(f => `\n        <li>${link(f, f.kurz || f.titel)} <small>PDF</small></a></li>`).join('');

// ---------- Marker ersetzen ----------
const block = (s, name, inner) => {
  const re = new RegExp('(<!--cms:' + name + '-->)[\\s\\S]*?(<!--/cms:' + name + '-->)', 'g');
  return s.replace(re, (m, a, b) => a + inner + b);
};
// Der Index-Block (Schritte, 14 Leerzeichen) und der Anfrage-Block (14) haben dieselbe Einrückung
const injectPage = (s, file) => {
  s = block(s, 'hinweis', hinweis);
  s = block(s, 'foot-hours', footHours());
  s = block(s, 'hours-rows', hoursRows);
  s = block(s, 'tel-rows', telRows);
  s = block(s, 'preise', preise);
  s = block(s, 'formulare', formulareFull(file === 'index.html' ? '            ' : '              '));
  s = block(s, 'foot-forms', formulareFoot);
  return s;
};

// ---------- Kontaktdaten: alt -> neu (Stand der letzten Anwendung steht in content/_stand.json) ----------
const telVariants = t => { const d = String(t).replace(/\D/g, '').replace(/^0/, ''); return { text: String(t), tel: '+49' + d }; };
const STAND = path.join(ROOT, 'content/_stand.json');
let stand = fs.existsSync(STAND) ? JSON.parse(fs.readFileSync(STAND, 'utf8')) : null;
if (!stand) stand = { telefon: K.telefon, fax: K.fax, email: K.email, hours: null };
const pairs = [];
if (stand.telefon !== K.telefon) { const o = telVariants(stand.telefon), n = telVariants(K.telefon); pairs.push([o.text, n.text], [o.tel, n.tel]); }
if (stand.fax !== K.fax) pairs.push([stand.fax, K.fax]);
if (stand.email !== K.email) {
  const o = stand.email, n = K.email;
  const wbr = e => e.replace('@', '<wbr>@');
  pairs.push([wbr(o), wbr(n)], [o, n]);
}
const applyPairs = s => pairs.reduce((acc, [a, b]) => acc.split(a).join(b), s);

const edit = (file, fn) => {
  const p = path.join(ROOT, file);
  let s = fs.readFileSync(p, 'utf8');
  const crlf = s.includes('\r\n');
  if (crlf) s = s.replace(/\r\n/g, '\n');
  const out = fn(s);
  if (out !== s) fs.writeFileSync(p, crlf ? out.replace(/\n/g, '\r\n') : out);
  return out !== s;
};

let changed = 0;
PAGES.forEach(f => { if (edit(f, s => applyPairs(injectPage(s, f)))) changed++; });
if (edit('js/main.js', s => s.replace(/\/\*cms:slots\*\/[\s\S]*?\/\*\/cms:slots\*\//, () => '/*cms:slots*/' + slotsJs + '/*/cms:slots*/'))) changed++;
if (edit('js/search-index.json', s => {
  const plain = plainHours();
  if (stand.hours && stand.hours !== plain) s = s.split(stand.hours).join(plain);
  return applyPairs(s);
})) changed++;

fs.writeFileSync(STAND, JSON.stringify({ telefon: K.telefon, fax: K.fax, email: K.email, hours: plainHours() }, null, 2) + '\n');
console.log('Fachpraxis Walter: ' + changed + ' Datei(en) aktualisiert.');
