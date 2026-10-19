import { TrainingPlan } from '../types';

// ============================================================
// Palmanova HM — A-race, PB attempt 1:28:xx
// 19.10.2026 → 29.11.2026, 6 tednov, tekma nedelja 29.11.2026 ob 10:00
//
// Vir: "Palmanova HM 2026 — plan za 1:28:xx" (Claude desktop, 19.10.2026),
// pripravljen iz izvoza LJ bloka (LJ-maraton-2026-blok.md).
//
// Izhodišče: LJ 1:29:51 s krčem v desni meči pri ~18,5 km in na ~3 h spanja.
// Cilj 1:28:30–1:28:59 (4:11–4:13/km uradno), ocena ~40 %; spodnji cilj PB pod
// 1:29:51 (~75 %, če gleženj sodeluje). Ciljni tempo Tim določi ob koncu bloka.
//
// Pravila (prednost pred planom):
//  Gleženj (bolečina 0–10) — tetiva desno (najverjetneje tibialis posterior):
//   - tek dovoljen pri ≤3/10 med tekom in če naslednje jutro ni slabše;
//   - kakovostni trening (intervali, tempo, test) samo pri 0–2/10;
//   - >3/10, šepanje, oteklina ali slabše zjutraj → brez teka, 40–60 min kolo/hoja;
//   - če do Ned 25.10. ne gre 30 min teka brez bolečine, se T2 zamakne;
//     prvi odpade 10K test, ne Palmanova.
//  Spanje:
//   - noč pod ~5 h ali zelo razkosana → ključni trening en dan kasneje;
//   - dve slabi noči zapored → namesto intervalov/tempa lahek tek;
//   - lahek tek 8+ udarcev višje pri istem tempu → ta dan lahko ali počitek;
//   - med trdima treningoma vsaj 48 h.
//  Prioritete: 🔑 Ključni (ne izpusti, ±1 dan) · Pomemben (izpusti v slabem tednu)
//   · Opcijski (izpusti prvi). Minimalni teden: Tor + Ned + en lahek tek.
//  Ponovitve: zadnja ni hitrejša od prve za več kot 3 s/km.
//  Tempi v treningih so na uri (GPS, ~1 % preveč kot na LJ); tekmovalni tempo je
//  v uradnih km.
//
// Moč (Legs & Core Tor + Pet, ~25–30 min, RIR 2–3): bolgarski počep, enonožni RDL,
// enonožni dvigi na meča (soleus s skrčenim kolenom 3×10–12 s 3 s spustom, ravno
// koleno 3×10, izometrija na pol dviga 3×30–45 s); gleženj/stopalo (dvig s tenis
// žogico med petama 3×10, "kratko stopalo" 3×10, enonožna stoja na blazini 3×30 s,
// izometrična inverzija s trakom 5×30–45 s); kolk (stranski plank z dvigom bokov
// 3×10, clamshell 2×15). Desna noga +1 serija. V T1 samo izometrija. Skoki šele, ko
// je tetiva teden na 0/10; od T5 brez skokov. Fizioterapevt ima prednost.
//
// Copati: vsi hitri treningi v Superblast 3; Tokyo ostane v omari. Nov stabilnejši
// karbonski par do Čet 29.10.; odločitev Ned 8.11. — če ne prepriča, tekma v
// Superblast 3.
// ============================================================

export const palmanovaPlan: TrainingPlan = {
  id: 'palmanova-hm-2026',
  name: 'Palmanova HM (A-race, sub-1:30)',
  raceDate: '2026-11-29',
  raceLocation: 'Palmanova, Italija',
  targetPace: '4:10',
  athlete: 'Tim Šfiligoj',
  goal: 'F5c re-build + F5d taper. A-race cilj: PB attempt 1:28:xx. Vse moč usmerjena v ta dan.',
  weeks: [
    {
      week: 1,
      title: '19. okt – 25. okt',
      phase: 'TEDEN 1: REGENERACIJA + GLEŽENJ',
      focus: 'Umiriti gleženj in spočiti noge — brez intervalov, brez skokov. Fizioterapevt že ta teden. ~20 km (+6 opcijsko)',
      startDate: '2026-10-19',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek, hoja. Test: hoja brez bolečine + 10 enonožnih dvigov na prste desno.' },
        { day: 'Tor', type: 'bike', workout: 'Pomemben · Kolo 40 min lahko ali hoja. Izometrija meč 5× 45 s. Dogovori termin pri fizioterapevtu.' },
        { day: 'Sre', type: 'rest', workout: 'Opcijski · 6 km zelo lahko (HR ≤145), samo pri gležnju 0–2/10; sicer kolo.' },
        { day: 'Čet', type: 'strength', workout: 'Pomemben · Lahka moč: izometrija meč, stopalo, kolk. Brez skokov.' },
        { day: 'Pet', type: 'easy', workout: 'Pomemben · 8 km lahko + 4× strides, samo brez bolečine.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'easy', workout: 'Pomemben · 12 km lahko (5:15–5:35). Če 30 min teka ne gre brez bolečine → T2 se zamakne.' },
      ],
    },
    {
      week: 2,
      title: '26. okt – 1. nov',
      phase: 'TEDEN 2: PONOVNI ZAGON',
      focus: 'Prva kakovostna treninga samo pri gležnju 0–2/10. Novi tekmovalni copati doma do Čet 29.10. ~51 km (+6 opcijsko)',
      startDate: '2026-10-26',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '🔑 Ključni · 2 km WU + 5× 1 km @ 3:50 (r 90 s) + 2 km CD (~11 km). Legs & Core.' },
        { day: 'Sre', type: 'easy', workout: 'Pomemben · 8 km lahko.' },
        { day: 'Čet', type: 'strength', workout: 'Legs & Core. 👟 Opcijsko: 6 km lahko + strides v novih copatih (prvi preizkus).' },
        { day: 'Pet', type: 'tempo', workout: '🔑 Ključni · 2 km WU + 3× 3 km @ 4:10–4:12 (r 90 s) + 2 km CD (~14 km). Legs & Core. 👟 Novi copati.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: 'Pomemben · 18 km lahko; zadnja 3 km @ 4:15, če sta gleženj in meča mirna.' },
      ],
    },
    {
      week: 3,
      title: '2. nov – 8. nov',
      phase: 'TEDEN 3: GLAVNI TEDEN',
      focus: 'Najpomembnejši teden bloka. Nedelja je ključni trening proti krču: HM tempo na utrujenih mečih. ~53 km (+6 opcijsko)',
      startDate: '2026-11-02',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '🔑 Ključni · 2 km WU + 4× 2 km @ 3:55 (r 2 min) + 2 km CD (~13 km). Legs & Core.' },
        { day: 'Sre', type: 'easy', workout: 'Pomemben · 10 km lahko.' },
        { day: 'Čet', type: 'rest', workout: 'Opcijski · 6 km lahko + strides. Izmeri traso v Zapolju (za 10K test).' },
        { day: 'Pet', type: 'tempo', workout: 'Pomemben · 2 km WU + 5 km @ 4:10–4:12 + 2 km CD (~9 km). Legs & Core. Ob slabem spanju zamenjaj z 8 km lahko.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: '🔑 Ključni · 21 km: 12 km lahko + 8 km @ 4:10–4:13 + 1 km CD. Tekmovalni copati, gela na km 11 in 16. 👟 Dan odločitve o copatih (pogoj: brez bolečine naslednje jutro, gleženj se ne lomi — prosi koga za posnetek od zadaj). Po želji preizkusi elektrolitno kapsulo.' },
      ],
    },
    {
      week: 4,
      title: '9. nov – 15. nov',
      phase: 'TEDEN 4: 10K TEST',
      focus: 'Mini taper pred testom. Test lahko premakneš na Sob 14.11., če je tam boljše vreme ali spanje. ~38 km',
      startDate: '2026-11-09',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '🔑 Ključni · 2 km WU + 4× 1 km @ 3:45 (r 90 s) + 4× strides + 2 km CD (~9 km). Lahka Legs & Core (2 seriji, brez skokov).' },
        { day: 'Sre', type: 'easy', workout: 'Pomemben · 8 km lahko.' },
        { day: 'Čet', type: 'rest', workout: 'Počitek.' },
        { day: 'Pet', type: 'easy', workout: 'Pomemben · 6 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek (ali test, če je sobota boljši dan).' },
        { day: 'Ned', type: 'test', workout: '🔑 Ključni · 10K TEST Zapolje: 3 km WU + 3× strides + 10 km + 2 km CD (~15 km). Km 1 @ 4:00, ne hitreje; km 2–7 @ 3:57–3:59; km 8–10 vse, kar ostane. Kofeinski gel 15 min pred štartom, tekmovalni copati. Velja čas na uri za 10,00 km. Odpovej / zamenjaj s 3× 3 km @ 4:05 (r 2 min) pri gležnju >2/10, močnem vetru/dežju ali dveh slabih nočeh.' },
      ],
    },
    {
      week: 5,
      title: '16. nov – 22. nov',
      phase: 'TEDEN 5: REGENERACIJA + GENERALKA',
      focus: 'Prva dva dneva po testu samo lahko. Petek je generalka: vse, kar boš imel na tekmi. ~45 km (+5 opcijsko)',
      startDate: '2026-11-16',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'easy', workout: 'Pomemben · 8 km lahko. Legs & Core (2 seriji, brez skokov).' },
        { day: 'Sre', type: 'easy', workout: 'Pomemben · 8 km lahko + 4× strides.' },
        { day: 'Čet', type: 'rest', workout: 'Opcijski · Počitek ali 5 km lahko.' },
        { day: 'Pet', type: 'tempo', workout: '🔑 Ključni · GENERALKA: 2 km WU + 2× 4 km @ ciljni tempo (r 3 min lahko) + 2 km CD (~13 km). Tekmovalni copati, zajtrk, gel, oblačila (preizkusi rokavice in rokave). Po želji elektrolitna kapsula. Legs & Core (2 seriji).' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: 'Pomemben · 16 km lahko (5:10–5:25).' },
      ],
    },
    {
      week: 6,
      title: '23. nov – 29. nov',
      phase: 'TEDEN 6: TAPER + TEKMA',
      focus: '🏃 TEKMA TEDEN — enak vzorec kot pred LJ, ki je delovalo. Zadnja moč v torek. ~17 km + tekma',
      startDate: '2026-11-23',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'activation', workout: '🔑 Ključni · 2 km WU + 3× 1 km @ ciljni tempo (r 2 min) + 4× strides + 1 km CD (~7 km). Zadnja lahka moč (15 min, 2 seriji, brez skokov).' },
        { day: 'Sre', type: 'easy', workout: 'Pomemben · 6 km lahko.' },
        { day: 'Čet', type: 'rest', workout: 'Opcijski · 5 km lahko + 1 km @ ciljni tempo + 3× strides, ali počitek.' },
        { day: 'Pet', type: 'rest', workout: 'Počitek.' },
        { day: 'Sob', type: 'easy', workout: 'Pomemben · 4 km shakeout + 3× strides. Pica za kosilo, špageti za večerjo. Številka: Sob 14–19 h (ali prenočitev v Palmanovi).' },
        { day: 'Ned', type: 'race', workout: '🏃 PALMANOVA HM — štart 10:00, Piazza Grande. 2 km WU + 21,1 km. Km 1–3 @ 4:15, nato ciljni tempo, določen ob koncu bloka (izhodišče 4:12 uradno → ~1:28:33). Lovi uradne table, ne ure.' },
      ],
    },
  ],
  raceStrategy: {
    pacing: [
      { section: 'Km 1-3', instruction: '4:15/km uradno. Pospeševanje je tvoje tveganje št. 1. Ura kaže ~2–3 s/km hitreje od uradnega tempa — lovi uradne table, ne povprečja na uri.' },
      { section: 'Km 4-15', instruction: 'Ciljni tempo, določen ob koncu bloka (izhodišče 4:12/km uradno). Vmesni časi pri 4:12: 5 km 21:09 · 10 km 42:09 · 15 km 63:09. Proga je ravna in odprta (dvojni prehod skozi Clauiano) — poišči skupino in se v protivetru skrij za njo.' },
      { section: 'Km 16-21', instruction: 'Pospeši na ~4:10 samo, če so meča mirna; zadnja 2 km vse. Cilj ~1:28:33.' },
      { section: 'Če se meča oglasijo', instruction: 'Prvi trzljaj: skrajšaj korak, dvigni kadenco, sprosti stopala, ~500 m 3–5 s/km počasneje. Ustavi se šele, ko se mišica zaklene; kratek razteg kot na LJ, nato nazaj v ritem.' },
    ],
    nutrition: [
      { when: 'Dan prej', what: 'Pica za kosilo, špageti za večerjo. Številka Sob 14–19 h (Ned 7:30–9:00 je ob vožnji iz Logatca tesno) — razmisli o prenočitvi v Palmanovi.' },
      { when: 'Zajtrk', what: '~7:00: kruh z marmelado + izotonik.' },
      { when: 'Med tekmo', what: 'Gel protokol iz LJ: kofeinski 15 min pred štartom, gel na km 6, kofeinski na km 12, gel na km 18. Voda ~vsakih 5 km po občutku. Elektrolitna kapsula samo, če je preizkušena (Ned 8.11., Pet 20.11.).' },
      { when: 'Oprema', what: 'Copati po odločitvi Ned 8.11. (nov stabilen par ali Superblast 3 — ne Tokyo). Konec novembra je lahko mraz: rokavice in rokavi, preizkušeni na generalki 20.11.' },
    ],
  },
  hrZones: {
    z1: { range: '< 140 bpm', purpose: 'Regeneracija' },
    z2: { range: '140-150 bpm', purpose: 'Lahki in dolgi teki (raje 140-147)' },
    z3: { range: '151-169 bpm', purpose: 'Siva cona' },
    z4: { range: '170-180 bpm', purpose: 'HM cilj (~170-173), 10K tempo (~175-180)' },
    z5: { range: '> 180 bpm', purpose: 'Intervali 1 km (do ~180)' },
  },
  paceZones: {
    easy: '5:15-5:45 /km',
    long: '5:05-5:25 /km',
    hmTempo: '4:10-4:12 /km',
    threshold: '3:56-3:59 /km',
    vo2max: '3:52-3:55 /km',
  },
};
