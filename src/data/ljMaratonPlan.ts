import { TrainingPlan } from '../types';

// ============================================================
// LJ Maraton (21km) — A-race, sub-1:30
// 20.7.2026 → 18.10.2026, 13 tednov, tekma nedelja 18.10.2026
//
// Kontekst (iz podatkov v aplikaciji):
//  - Tim: max HR 194, ~55 km/teden, 3 leta teka. Istrski PM 12.4.2026 → 1:33:33
//    (4:26/km, negative split, ravninska proga).
//  - Baza (baza-pb blok, 491 km): long runi do 24 km @ 5:33 HR 147, tempo 13 km
//    @ 4:41 HR 159, intervali 13 km @ 4:51 HR 163. Odlična aerobna baza,
//    specifičnega HM tempa (4:15/km) še ni pokazal — a HR na tempih (156-160)
//    kaže veliko rezerve.
//  - Ta teden (13.-19.7.) bolan → le ~11 km. Zato T1 lahji (~50 km), nato
//    progresija proti 60-65 km.
//  - Slabost: razpad pozno + startna nervoza → zato veliko HM-tempa v utrujenosti
//    (embedded v long run) in jasna race-day strategija.
//
// Struktura tedna: Tor intervali, Sre easy, Pet tempo, Ned long run.
//  Čet = opcijsko 5. lahek tek (za volumen). Moč = "Legs & Core" 2× teden,
//  ob hard dnevih (Tor + Pet), da easy/rest dnevi ostanejo lahki.
// ============================================================

export const ljMaratonPlan: TrainingPlan = {
  id: 'lj-maraton-2026',
  name: 'LJ Maraton (21km)',
  raceDate: '2026-10-18',
  raceLocation: 'Ljubljana, Slovenija',
  raceUrl: 'https://www.ljubljanskimaraton.si/',
  targetPace: '4:15',
  athlete: 'Tim Šfiligoj',
  goal: 'Ljubljanski polmaraton 18. oktober 2026 — CILJ: sub-1:30 (4:15/km). 13-tedenski specifičen blok po bolezni: ponovni zagon → prag/VO2max → HM specifika → taper. Moč: Legs & Core 2× teden (ob hard dnevih).',
  weeks: [
    {
      week: 1,
      title: '20. jul – 26. jul',
      phase: 'FAZA 1: PONOVNI ZAGON + BAZA',
      focus: 'Vračanje po bolezni — lažji teden (~50 km), brez sile, obnova ritma',
      startDate: '2026-07-20',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija: mobilnost, foam roller, raztezanje (še vračanje po bolezni — brez sile)' },
        { day: 'Tor', type: 'intervals', workout: 'Lahek fartlek: 2 km ogrevanje + 8× (1 min hitro ~4:05/km / 1 min lahko) + 2 km ohlajanje (~10 km). Po bolezni — po občutku, ne globoko v napor.' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 8 km @ 5:20-5:40/km, HR pod 150 (Z2)' },
        { day: 'Čet', type: 'rest', workout: 'Počitek (ali opcijsko 5 km zelo lahek tek za volumen, če se počutiš dobro)' },
        { day: 'Pet', type: 'tempo', workout: 'Kontroliran tempo: 2 km ogrevanje + 12 min @ 4:35/km + 2 km ohlajanje (~9 km). Ne globoko v napor — prvi tempo po bolezni.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 16 km @ 5:20-5:35/km, lahko, HR pod 155' },
      ],
    },
    {
      week: 2,
      title: '27. jul – 2. avg',
      phase: 'FAZA 1: PONOVNI ZAGON + BAZA',
      focus: 'Vrnitev na ustaljen ritem, uvedba VO2max intervalov + moči',
      startDate: '2026-07-27',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija: mobilnost, foam roller' },
        { day: 'Tor', type: 'intervals', workout: 'Intervali: 2 km ogrevanje + 6× 800 m @ 3:58/km (r 90 s lahek tek) + 2 km ohlajanje (~11 km)  •  💪 Legs & Core (25 min) po teku' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 9 km @ 5:15-5:35/km, HR pod 155' },
        { day: 'Čet', type: 'rest', workout: 'Počitek (ali opcijsko 6 km lahek tek — 5. tek za volumen)' },
        { day: 'Pet', type: 'tempo', workout: 'Tempo: 2 km ogrevanje + 20 min @ 4:28/km + 2 km ohlajanje (~11 km)  •  💪 Legs & Core (25 min) po teku' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 20 km @ 5:10-5:25/km, rahlo valovita trasa, HR pod 155' },
      ],
    },
    {
      week: 3,
      title: '3. avg – 9. avg',
      phase: 'FAZA 1: PONOVNI ZAGON + BAZA',
      focus: 'Gradnja volumna (~62 km), daljši intervali in tempo bloki',
      startDate: '2026-08-03',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija: mobilnost, foam roller' },
        { day: 'Tor', type: 'intervals', workout: 'Intervali: 2 km ogrevanje + 5× 1000 m @ 3:58/km (r 90 s) + 2 km ohlajanje (~12 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 10 km @ 5:15-5:35/km' },
        { day: 'Čet', type: 'rest', workout: 'Opcijsko: 7 km lahek tek (5. tek za volumen) ali počitek' },
        { day: 'Pet', type: 'tempo', workout: 'Tempo: 2 km ogrevanje + 2× 12 min @ 4:22/km (r 3 min lahek) + 2 km ohlajanje (~13 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 24 km @ 5:10-5:25/km na valoviti/hriboviti trasi (klance mirno). Vaja za vzdržljivost.' },
      ],
    },
    {
      week: 4,
      title: '10. avg – 16. avg',
      phase: 'FAZA 2: PRAG + VO2MAX',
      focus: 'Regeneracijski teden (deload) — nižji volumen, ohranjena ostrina',
      startDate: '2026-08-10',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Lahka mobilnost, raztezanje (deload)' },
        { day: 'Tor', type: 'intervals', workout: 'Intervali (deload): 2 km ogrevanje + 6× 400 m @ 3:52/km (r polni odmor) + 4× 100 m strides + 2 km ohlajanje (~9 km)  •  💪 Legs & Core lažje (20 min)' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 8 km @ 5:20-5:40/km' },
        { day: 'Čet', type: 'rest', workout: 'Počitek (deload)' },
        { day: 'Pet', type: 'tempo', workout: 'Kratek tempo: 2 km ogrevanje + 15 min @ 4:22/km + 2 km ohlajanje (~9 km)' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 16 km @ 5:15-5:30/km, lahko (deload)' },
      ],
    },
    {
      week: 5,
      title: '17. avg – 23. avg',
      phase: 'FAZA 2: PRAG + VO2MAX',
      focus: 'Pragovni razvoj, prvi progresivni long run',
      startDate: '2026-08-17',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija: mobilnost, foam roller' },
        { day: 'Tor', type: 'intervals', workout: 'Intervali: 2 km ogrevanje + 5× 1200 m @ 4:00/km (r 90 s) + 2 km ohlajanje (~12 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 10 km @ 5:15-5:35/km' },
        { day: 'Čet', type: 'rest', workout: 'Opcijsko: 7 km lahek tek (5. tek) ali počitek' },
        { day: 'Pet', type: 'tempo', workout: 'Tempo: 2 km ogrevanje + 6 km @ 4:20/km + 2 km ohlajanje (~11 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 22 km @ 5:10/km, zadnjih 6 km @ 4:35/km (progresivni finish)' },
      ],
    },
    {
      week: 6,
      title: '24. avg – 30. avg',
      phase: 'FAZA 2: PRAG + VO2MAX',
      focus: 'Vrhunec baze (~65 km), uvedba HM tempa + najdaljši aerobni tek',
      startDate: '2026-08-24',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija: mobilnost, foam roller' },
        { day: 'Tor', type: 'intervals', workout: 'Intervali: 2 km ogrevanje + 6× 1000 m @ 3:55/km (r 75 s) + 2 km ohlajanje (~13 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 11 km @ 5:15-5:35/km' },
        { day: 'Čet', type: 'rest', workout: 'Opcijsko: 8 km lahek tek (5. tek) ali počitek' },
        { day: 'Pet', type: 'tempo', workout: 'Tempo (HM pace): 2 km ogrevanje + 3× 2 km @ 4:16/km (r 90 s) + 2 km ohlajanje (~13 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 26 km @ 5:10-5:20/km, hribovita trasa. Najdaljši aerobni tek — vaja proti razpadu.' },
      ],
    },
    {
      week: 7,
      title: '31. avg – 6. sep',
      phase: 'FAZA 2: PRAG + VO2MAX',
      focus: 'Pragovni intervali + HM tempo v utrujenosti (embedded long)',
      startDate: '2026-08-31',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija: mobilnost, foam roller' },
        { day: 'Tor', type: 'intervals', workout: 'Intervali: 2 km ogrevanje + 4× 1600 m @ 4:05/km (prag, r 90 s) + 2 km ohlajanje (~13 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 10 km @ 5:15-5:35/km' },
        { day: 'Čet', type: 'rest', workout: 'Opcijsko: 7 km lahek tek (5. tek) ali počitek' },
        { day: 'Pet', type: 'tempo', workout: 'Tempo: 2 km ogrevanje + 8 km @ 4:18/km (neprekinjeno, HM napor) + 2 km ohlajanje (~13 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: '⭐ Dolgi tek: 24 km @ 5:10/km, zadnjih 8 km @ 4:20/km (HM tempo v utrujenosti — ključna vaja proti razpadu!)' },
      ],
    },
    {
      week: 8,
      title: '7. sep – 13. sep',
      phase: 'FAZA 3: HM SPECIFIKA (sub-1:30)',
      focus: '⭐ TESTNI TEDEN — deload + 5K time-trial za kalibracijo forme',
      startDate: '2026-09-07',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija, mobilnost' },
        { day: 'Tor', type: 'intervals', workout: 'Lahki intervali: 2 km ogrevanje + 5× 200 m strides @ 3:40/km (r polni) + 2 km ohlajanje (~7 km). Svežina za test.' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 8 km @ 5:20/km' },
        { day: 'Čet', type: 'rest', workout: 'Počitek (priprava na test)' },
        { day: 'Pet', type: 'easy', workout: 'Lahek tek: 5 km @ 5:20/km + 4× 100 m strides (razgibanje pred testom)' },
        { day: 'Sob', type: 'test', workout: '⭐ TEST: 2 km ogrevanje + 5K time-trial ALL-OUT (ali parkrun/10K tekma) + 2 km ohlajanje. CILJ: 5K ~20:00 → potrjuje trajektorijo sub-1:30 (za sub-1:30 rabiš ~19:40 5K / ~41:00 10K do konca septembra).' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 18 km @ 5:15-5:30/km, lahko (regeneracija po testu)' },
      ],
    },
    {
      week: 9,
      title: '14. sep – 20. sep',
      phase: 'FAZA 3: HM SPECIFIKA (sub-1:30)',
      focus: 'Vrhunec (~65 km): dolg HM tempo blok + HM pace globoko v long runu',
      startDate: '2026-09-14',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija: mobilnost, foam roller' },
        { day: 'Tor', type: 'intervals', workout: 'Intervali: 2 km ogrevanje + 5× 1000 m @ 3:53/km (r 90 s) + 2 km ohlajanje (~12 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 11 km @ 5:15-5:35/km' },
        { day: 'Čet', type: 'rest', workout: 'Opcijsko: 8 km lahek tek (5. tek) ali počitek' },
        { day: 'Pet', type: 'tempo', workout: 'Tempo (HM pace): 2 km ogrevanje + 10 km @ 4:16/km + 2 km ohlajanje (~14 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: '⭐ Dolgi tek: 26 km @ 5:05-5:20/km, zadnjih 6 km @ 4:15/km (HM tempo globoko v utrujenosti — ključno!)' },
      ],
    },
    {
      week: 10,
      title: '21. sep – 27. sep',
      phase: 'FAZA 3: HM SPECIFIKA (sub-1:30)',
      focus: 'Najbolj specifičen teden: pragovni 2000-ke + HM bloki v long runu',
      startDate: '2026-09-21',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija: mobilnost, foam roller' },
        { day: 'Tor', type: 'intervals', workout: 'Intervali: 2 km ogrevanje + 3× 2000 m @ 4:08/km (prag, r 2 min) + 2 km ohlajanje (~13 km)  •  💪 Legs & Core (30 min)' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 10 km @ 5:15-5:35/km' },
        { day: 'Čet', type: 'rest', workout: 'Opcijsko: 7 km lahek tek (5. tek) ali počitek' },
        { day: 'Pet', type: 'tempo', workout: 'Tempo: 2 km ogrevanje + 4× 2 km @ 4:12/km (r 75 s) + 2 km ohlajanje (~13 km)  •  💪 Legs & Core (25 min)' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 24 km @ 5:10/km s 3× 3 km @ 4:16/km (HM bloki, vmes 1 km lahko). Zadnja simulacija dirkalnega ritma.' },
      ],
    },
    {
      week: 11,
      title: '28. sep – 4. okt',
      phase: 'FAZA 3: HM SPECIFIKA (sub-1:30)',
      focus: 'Zadnji večji teden + race-pace simulacija, začetek zniževanja',
      startDate: '2026-09-28',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija: mobilnost, foam roller' },
        { day: 'Tor', type: 'intervals', workout: 'Intervali: 2 km ogrevanje + 6× 1000 m @ 3:58/km (r 75 s) + 2 km ohlajanje (~13 km)  •  💪 Legs & Core lažje (20 min)' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 9 km @ 5:15-5:35/km' },
        { day: 'Čet', type: 'rest', workout: 'Počitek (ali opcijsko 6 km lahko)' },
        { day: 'Pet', type: 'tempo', workout: 'Tempo (HM goal): 2 km ogrevanje + 8 km @ 4:15/km + 2 km ohlajanje (~13 km). Zadnja večja HM simulacija.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 20 km @ 5:10/km, zadnjih 6 km @ 4:18/km' },
      ],
    },
    {
      week: 12,
      title: '5. okt – 11. okt',
      phase: 'FAZA 4: TAPER + TEKMA',
      focus: 'Taper — zmanjšan volumen, ohranjena ostrina, svežina',
      startDate: '2026-10-05',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Regeneracija, mobilnost (taper)' },
        { day: 'Tor', type: 'intervals', workout: 'Kratki intervali: 2 km ogrevanje + 5× 600 m @ 3:55/km (r 90 s) + 2 km ohlajanje (~9 km)  •  💪 Legs & Core zelo lahko (15 min) — zadnja moč' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 8 km @ 5:20/km' },
        { day: 'Čet', type: 'rest', workout: 'Počitek ali lahka mobilnost (taper)' },
        { day: 'Pet', type: 'tempo', workout: 'HM simulacija: 2 km ogrevanje + 5 km @ 4:15/km + 2 km ohlajanje (~9 km)' },
        { day: 'Sob', type: 'rest', workout: 'Počitek' },
        { day: 'Ned', type: 'long', workout: 'Dolgi tek: 15 km @ 5:15-5:30/km, lahko (taper — brez pospeševanja)' },
      ],
    },
    {
      week: 13,
      title: '12. okt – 18. okt',
      phase: 'FAZA 4: TAPER + TEKMA',
      focus: '🏃 TEKMA TEDEN — svež na start, sub-1:30',
      startDate: '2026-10-12',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek ali lahka mobilnost (tekma teden — brez moči!)' },
        { day: 'Tor', type: 'activation', workout: 'Aktivacija: 2 km ogrevanje + 3× 1 km @ 4:10/km (r 2 min) + 4× 100 m strides + 1 km ohlajanje (~8 km)' },
        { day: 'Sre', type: 'easy', workout: 'Lahek tek: 6 km @ 5:20/km + 4× 100 m strides' },
        { day: 'Čet', type: 'rest', workout: 'Počitek ali 20 min zelo lahek tek' },
        { day: 'Pet', type: 'easy', workout: 'Shakeout: 4 km lahek tek + 3× 100 m strides. Hidracija, priprava opreme, carb-load.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek — dan pred tekmo. Zgodaj spat, pripravi opremo in štartno številko.' },
        { day: 'Ned', type: 'race', workout: '🏃 LJUBLJANSKI POLMARATON — 21,1 km. CILJ: sub-1:30 (4:15/km). Kontroliran štart, negative split — kot na Istrskem!' },
      ],
    },
  ],
  raceStrategy: {
    pacing: [
      { section: 'Km 1-5', instruction: '4:18/km — umirjen štart. NE zapravi adrenalina; LJ je ravninska/hitra proga, čas pride sam. Pusti hitre mimo.' },
      { section: 'Km 5-15', instruction: '4:15/km — zakleni ritem, enakomerno in "controlled". Gel pri km 8. Pij na vsaki postaji (manjši požirki).' },
      { section: 'Km 15-21', instruction: 'Če imaš rezervo: 4:12-4:13/km. Gel pri km 14. Tvoja moč je negative split (Istrski 1:33:33!) — izkoristi ga. Zadnja 2 km vse ven.' },
    ],
    nutrition: [
      { when: 'Teden prej', what: 'Taper: manj volumna, več spanca. Zadnja 2-3 dni carb-load (testenine, riž, ovseni kosmiči).' },
      { when: 'Dan prej', what: 'Ogljikovi hidrati, 3 L vode + elektroliti. Brez vlaknin in eksperimentov. Zgodaj spat.' },
      { when: 'Zajtrk', what: '3 h pred štartom: ovsena kaša + banana + kava (kar poznaš). Nič novega.' },
      { when: 'Med tekmo', what: 'Gel pri km 8 in km 14. Voda/izotonik na vsaki postaji.' },
      { when: 'Živci', what: 'Pridi zgodaj, 12-15 min ogrevanje + strides. Tvoji slabosti sta živci in pozen razpad — načrt je jasen: umirjen štart, gel pravočasno, negative split. Zaupaj treningu.' },
    ],
  },
  hrZones: {
    z1: { range: '< 145 bpm', purpose: 'Regeneracija' },
    z2: { range: '145-158 bpm', purpose: 'Aerobna baza (lahki / dolgi teki)' },
    z3: { range: '159-170 bpm', purpose: 'IZOGIBAJ SE — siva cona' },
    z4: { range: '171-182 bpm', purpose: 'Tempo / Prag (HM napor, intervali)' },
    z5: { range: '> 182 bpm', purpose: 'VO2max (kratki intervali)' },
  },
  paceZones: {
    easy: '5:15-5:40 /km',
    long: '5:05-5:25 /km',
    hmTempo: '4:12-4:18 /km',
    threshold: '4:05-4:12 /km',
    vo2max: '3:50-4:00 /km',
  },
};
