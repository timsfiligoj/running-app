import { TrainingPlan } from '../types';

// ============================================================
// Bratislava maraton — 28.12.2026 → 11.4.2027, 15 tednov, tekma Ned 11.4.2027
//
// Okvirni plan (Claude), dokler ne pride plan od Bena Piškurja.
// Cilj 3:15–3:20 → MP (maratonski tempo) 4:40/km.
//
// Ogrodje (Timov opis):
//  - 4 teki na teden (5. opcijski v Čet): Tor intervali, Sre lahko, Pet lahko,
//    Ned long run. Tempo ni več ločen trening — MP je vgrajen v long run.
//  - Intervali 1× na teden ohranjajo hitrost za sub-1:30 polmaraton.
//  - Max ~80 km/teden (vrh 77–80 v T12). Že 2 tedna pri 65 km sta prinesla
//    težave, zato vsak 3.–4. teden lažji. Ob bolečini ostani na prejšnjem tednu.
//  - Kontrolni 30 km Ned 21.2. (16 km @ MP): če je lahek, cilj proti 3:10.
//  - HM test Ned 7.3. (ali tekma, če se najde).
//
// Moč (Jakob Cigale, dopolnitev 24.11.):
//  - Baza do začetka februarja (T1–T6): 3× na teden — Tor, Čet, Sob. Če je
//    preveč, 2×. Tek ima prednost; izpuščen trening moči ni problem.
//  - Glavni del do sredine marca (T7–T11): 2× na teden — Tor, Čet.
//  - Zadnji mesec (od T12): 1× na teden, lahko z manj ponovitvami.
//    Zadnji lahek trening moči Čet 1.4. (10 dni pred tekmo).
//  - Stopnjevanje: vsak teden +2 ponovitvi; pri 12 nazaj na 8 in breme
//    največ +5 kg. Plyo od januarja, postopoma in po občutku.
// ============================================================

export const bratislavaPlan: TrainingPlan = {
  id: 'bratislava-maraton-2027',
  name: 'Bratislava maraton (3:15–3:20)',
  raceDate: '2027-04-11',
  raceLocation: 'Bratislava, Slovaška',
  targetPace: '4:40',
  athlete: 'Tim Šfiligoj',
  goal: 'Maraton 3:15–3:20 brez zidu pri 25–28 km. Hitrost ohranjam z enimi intervali na teden, MP vadim v long runih.',
  weeks: [
    {
      week: 1,
      title: '28. dec – 3. jan',
      phase: 'TEDEN 1: ZAČETEK BLOKA',
      focus: 'Ritem 4 tekov na teden. Moč 3× na teden (Tor, Čet, Sob). ~45 km',
      startDate: '2026-12-28',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~10 km: 2 km WU + 6× 800 m @ 3:50 (p 2 min) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '8 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Pet', type: 'easy', workout: '9 km lahko + 4× strides.' },
        { day: 'Sob', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Ned', type: 'long', workout: '18 km lahko (5:10–5:30).' },
      ],
    },
    {
      week: 2,
      title: '4. jan – 10. jan',
      phase: 'TEDEN 2: PRVI MP',
      focus: 'Prvi kilometri MP v long runu. Plyo od tega tedna, po občutku. ~51 km',
      startDate: '2027-01-04',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~11 km: 2 km WU + 5× 1 km @ 3:55 (p 90 s) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Plyo + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '10 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Pet', type: 'easy', workout: '10 km lahko + 4× strides.' },
        { day: 'Sob', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Ned', type: 'long', workout: '20 km: 16 km lahko + 4 km @ MP 4:40.' },
      ],
    },
    {
      week: 3,
      title: '11. jan – 17. jan',
      phase: 'TEDEN 3: GRADNJA',
      focus: 'Daljši intervali, long run 22 km. ~57 km',
      startDate: '2027-01-11',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~12 km: 2 km WU + 3× 2 km @ 4:00 (p 2 min) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Plyo + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '11 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.', extra: [{ type: 'easy', workout: 'Opcijsko · 6 km lahko.' }] },
        { day: 'Pet', type: 'easy', workout: '12 km lahko + 4× strides.' },
        { day: 'Sob', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Ned', type: 'long', workout: '22 km lahko, zadnje 3 km postopoma do MP 4:40.' },
      ],
    },
    {
      week: 4,
      title: '18. jan – 24. jan',
      phase: 'TEDEN 4: LAŽJI TEDEN',
      focus: 'Manj kilometrov, kratki hitri intervali. ~48 km',
      startDate: '2027-01-18',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~9 km: 2 km WU + 8× 400 m @ 3:40 (p 200 m lahko) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Plyo + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '10 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Pet', type: 'easy', workout: '10 km lahko + 4× strides.' },
        { day: 'Sob', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Ned', type: 'long', workout: '18 km lahko.' },
      ],
    },
    {
      week: 5,
      title: '25. jan – 31. jan',
      phase: 'TEDEN 5: MP BLOK',
      focus: 'Prvi daljši MP v long runu (10 km). ~63 km',
      startDate: '2027-01-25',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~13 km: 2 km WU + 4× 2 km @ 3:58 (p 2 min) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Plyo + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '12 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.', extra: [{ type: 'easy', workout: 'Opcijsko · 6 km lahko.' }] },
        { day: 'Pet', type: 'easy', workout: '12 km lahko + 4× strides.' },
        { day: 'Sob', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Ned', type: 'long', workout: '26 km: 14 km lahko + 10 km @ MP 4:40 + 2 km CD. Gel vsakih 5–6 km.' },
      ],
    },
    {
      week: 6,
      title: '1. feb – 7. feb',
      phase: 'TEDEN 6: ČAS NA NOGAH',
      focus: 'Najdaljši lahki long run do zdaj. ~66 km',
      startDate: '2027-02-01',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~12 km: 2 km WU + 6× 1 km @ 3:52 (p 90 s) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Plyo + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '12 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.', extra: [{ type: 'easy', workout: 'Opcijsko · 6 km lahko.' }] },
        { day: 'Pet', type: 'easy', workout: '14 km lahko + 4× strides.' },
        { day: 'Sob', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Ned', type: 'long', workout: '28 km lahko (5:10–5:25), zadnja 2 km @ MP 4:40.' },
      ],
    },
    {
      week: 7,
      title: '8. feb – 14. feb',
      phase: 'TEDEN 7: MP V KOSIH',
      focus: '15 km MP v treh kosih. Moč od zdaj 2× na teden (Tor, Čet). ~68 km',
      startDate: '2027-02-08',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'tempo', workout: '~14 km: 2 km WU + 3× 3 km @ 4:05 (p 2 min) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Plyo + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '14 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.', extra: [{ type: 'easy', workout: 'Opcijsko · 6 km lahko.' }] },
        { day: 'Pet', type: 'easy', workout: '14 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: '26 km: 6 km lahko + 3× 5 km @ MP 4:40 (p 1 km lahko) + 3 km CD.' },
      ],
    },
    {
      week: 8,
      title: '15. feb – 21. feb',
      phase: 'TEDEN 8: KONTROLNI 30 KM',
      focus: 'Teden je lažji, da je nedelja sveža. Kontrolni 30 km pokaže, ali je cilj 3:15 ali bliže 3:10. ~58 km',
      startDate: '2027-02-15',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~10 km: 2 km WU + 5× 1 km @ 3:52 (p 90 s) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Plyo + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '10 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core (lažje).' },
        { day: 'Pet', type: 'easy', workout: '8 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'test', workout: '🔑 KONTROLNI 30 km: 12 km lahko + 16 km @ MP 4:40 + 2 km CD. Tekmovalni copati in gel protokol kot na tekmi. Če je MP lahek in HR ostane mirna → cilj proti 3:10.' },
      ],
    },
    {
      week: 9,
      title: '22. feb – 28. feb',
      phase: 'TEDEN 9: VOLUMEN',
      focus: 'Prvi teden nad 70 km. ~73 km',
      startDate: '2027-02-22',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~15 km: 2 km WU + 5× 2 km @ 4:00 (p 2 min) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Plyo + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '14 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.', extra: [{ type: 'easy', workout: 'Opcijsko · 6 km lahko.' }] },
        { day: 'Pet', type: 'easy', workout: '14 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: '30 km lahko, zadnjih 5 km postopoma do MP 4:40.' },
      ],
    },
    {
      week: 10,
      title: '1. mar – 7. mar',
      phase: 'TEDEN 10: HM TEST',
      focus: 'Mini taper pred polmaratonom — preverim, ali je sub-1:30 še tam. ~53 km',
      startDate: '2027-03-01',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~9 km: 2 km WU + 4× 1 km @ 3:55 (p 90 s) + 4× strides + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Plyo + Core (lažje).' }] },
        { day: 'Sre', type: 'easy', workout: '10 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core (lažje).' },
        { day: 'Pet', type: 'easy', workout: '8 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'test', workout: '🔑 HM TEST (ali tekma): 3 km WU + 21,1 km na sub-1:30 (4:15) + 2 km CD. Km 1–3 @ 4:20, nato po občutku.' },
      ],
    },
    {
      week: 11,
      title: '8. mar – 14. mar',
      phase: 'TEDEN 11: DOLGI TEDEN',
      focus: 'Prva dva dneva po testu samo lahko. Najdaljši lahki long run. Zadnji teden moči 2×. ~75 km',
      startDate: '2027-03-08',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'easy', workout: '12 km lahko + 6× strides.', extra: [{ type: 'strength', workout: 'Legs + Core (brez plyo po testu).' }] },
        { day: 'Sre', type: 'easy', workout: '14 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Plyo + Core.', extra: [{ type: 'easy', workout: 'Opcijsko · 6 km lahko.' }] },
        { day: 'Pet', type: 'easy', workout: '16 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: '33 km lahko (5:10–5:25), zadnja 3 km @ MP 4:40. Gel vsakih 5–6 km.' },
      ],
    },
    {
      week: 12,
      title: '15. mar – 21. mar',
      phase: 'TEDEN 12: VRH',
      focus: 'Najtežji teden bloka. Generalka MP na utrujenih nogah. Moč od zdaj 1× na teden. ~77 km',
      startDate: '2027-03-15',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~15 km: 2 km WU + 5× 2 km @ 3:58 (p 2 min) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Core (manj ponovitev).' }] },
        { day: 'Sre', type: 'easy', workout: '14 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'rest', workout: 'Opcijsko: 6 km lahko.' },
        { day: 'Pet', type: 'easy', workout: '16 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: '🔑 32 km: 14 km lahko + 16 km @ MP 4:40 + 2 km CD. Generalka: copati, oblačila, zajtrk in geli kot na tekmi.' },
      ],
    },
    {
      week: 13,
      title: '22. mar – 28. mar',
      phase: 'TEDEN 13: TAPER 1',
      focus: 'Kilometri navzdol, intenzivnost ostane. ~60 km',
      startDate: '2027-03-22',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~11 km: 2 km WU + 6× 1 km @ 3:52 (p 90 s) + 2 km CD.', extra: [{ type: 'strength', workout: 'Legs + Core (manj ponovitev).' }] },
        { day: 'Sre', type: 'easy', workout: '12 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'rest', workout: 'Počitek.' },
        { day: 'Pet', type: 'easy', workout: '14 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: '22 km: 8 km lahko + 10 km @ MP 4:40 + 4 km lahko.' },
      ],
    },
    {
      week: 14,
      title: '29. mar – 4. apr',
      phase: 'TEDEN 14: TAPER 2',
      focus: 'Zadnji lahek trening moči v četrtek (10 dni pred tekmo). ~47 km',
      startDate: '2027-03-29',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~11 km: 2 km WU + 3× 2 km @ 4:05 (p 2 min) + 2 km CD.' },
        { day: 'Sre', type: 'easy', workout: '10 km lahko.' },
        { day: 'Čet', type: 'strength', workout: 'Zadnja lahka moč: Legs + Core (2 seriji, brez plyo).' },
        { day: 'Pet', type: 'easy', workout: '10 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: '16 km: 10 km lahko + 4 km @ MP 4:40 + 2 km CD.' },
      ],
    },
    {
      week: 15,
      title: '5. apr – 11. apr',
      phase: 'TEDEN 15: TEKMA',
      focus: '🏃 TEKMA TEDEN — spanje in ogljikovi hidrati. Od četrtka carb loading. ~22 km + tekma',
      startDate: '2027-04-05',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'activation', workout: '~8 km: 2 km WU + 4 km @ MP 4:40 + 4× strides + 2 km CD.' },
        { day: 'Sre', type: 'easy', workout: '6 km lahko.' },
        { day: 'Čet', type: 'rest', workout: 'Počitek.' },
        { day: 'Pet', type: 'easy', workout: '5 km lahko + 3× strides.' },
        { day: 'Sob', type: 'easy', workout: '3 km shakeout + 2× strides.' },
        { day: 'Ned', type: 'race', workout: '🏃 BRATISLAVA MARATON. Km 1–5 @ 4:45, nato 4:38–4:42. Do 30 km se ne žene nihče; tekma se začne po 30. km.' },
      ],
    },
  ],
  raceStrategy: {
    pacing: [
      { section: 'Km 1-5', instruction: '4:45/km — namenoma počasneje. Prehiter začetek je bil razlog za zid na obeh preteklih maratonih.' },
      { section: 'Km 6-30', instruction: 'MP 4:38–4:42. Polovica ~1:38:30. Ne lovi izgubljenih sekund naenkrat.' },
      { section: 'Km 31-42', instruction: 'Če je vse mirno, drži tempo ali pospeši po malem. Če se pojavi krč: krajši korak, višja kadenca.' },
    ],
    nutrition: [
      { when: '3 dni prej', what: 'Carb loading (~8–10 g OH/kg na dan), malo vlaknin.' },
      { when: 'Zajtrk', what: '3 h pred štartom, preizkušen na long runih.' },
      { when: 'Med tekmo', what: 'Gel vsakih ~5–6 km (od km 5), kofeinska na km 20 in 32. Voda/izotonik na vsaki postaji. Vadi na vseh long runih z MP.' },
    ],
  },
  hrZones: {
    z1: { range: '< 140 bpm', purpose: 'Regeneracija' },
    z2: { range: '140-150 bpm', purpose: 'Lahki in dolgi teki' },
    z3: { range: '151-165 bpm', purpose: 'MP (~158-163)' },
    z4: { range: '166-180 bpm', purpose: 'HM tempo / intervali 2 km' },
    z5: { range: '> 180 bpm', purpose: 'Kratki intervali' },
  },
  paceZones: {
    easy: '5:10-5:40 /km',
    long: '5:10-5:25 /km',
    marathon: '4:38-4:42 /km',
    hmTempo: '4:10-4:15 /km',
    threshold: '3:58-4:05 /km',
    vo2max: '3:40-3:55 /km',
  },
};
