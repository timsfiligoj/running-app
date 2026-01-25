# Navodila za lokalno Running App

## 1. Odpri terminal v VS Code

Odpri VS Code, nato odpri mapo "Running app" na namizju:
- File → Open Folder → Desktop → Running app

## 2. Zaženi Claude Code

V terminalu VS Code zaženi:
```
claude
```

## 3. Kopiraj ta prompt v Claude Code:

---

Ustvari mi React + Vite aplikacijo za sledenje tekaškim treningom.

**Zahteve:**
- Vite + React + Tailwind CSS
- Podatki se shranjujejo v localStorage (brez backend-a)
- Slovenščina

**Funkcionalnosti:**
1. Prikaz 11-tedenskega načrta po tednih (accordion style)
2. Vsak trening ima checkbox za označitev "opravljeno"
3. Možnost urejanja opisa treninga (kaj sem dejansko naredil)
4. Progress bar za celoten načrt
5. Barvno kodirani tipi treningov (intervali=rdeča, tempo=rumena, lahek=zelena, dolgi=modra, klanci=oranžna, moč=vijolična, počitek=siva, test=roza, tekma=zlata)
6. Strategija za tekmo na dnu

**Podatki načrta:**
Uporabi ta JSON za podatke (prilepim spodaj).

Ko ustvariš app, mi povej kako ga zaženem z `npm run dev`.

---

## 4. Prilepi JSON podatke

Ko te Claude Code vpraša za podatke, prilepi vsebino iz datoteke `training-plan-data.json` ki je v tej mapi.

## 5. Zaženi app

Ko Claude Code konča, zaženi:
```
npm run dev
```

App bo dostopen na http://localhost:5173

---

## Dodatne funkcije ki jih lahko dodaš kasneje:

Reci Claude Code:
- "Dodaj možnost exporta podatkov v JSON"
- "Dodaj graf tedenskega volumna"
- "Dodaj dark mode"
- "Dodaj možnost dodajanja novih treningov"
