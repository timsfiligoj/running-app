import { TrainingPlan } from '../types';

// ============================================================
// Baza po Palmanovi — 30.11.2026 → 27.12.2026, 4 tedni
//
// Most med Palmanovo in blokom za Bratislavo (začne se Pon 28.12.).
// Tedna 1–2 lahko + izometrija (plan Jakoba Cigaleta), tedna 3–4 nazaj na
// ~45–50 km in prvi kratki hitri deli, da hitrost ne zaspi.
//
// Moč (Jakob Cigale, "Tim - trening za moč v maraton bloku.xlsx"):
//  - Izometrija (1–2× na dan od 3.12.): wall sit, potisk žoge v steno, most,
//    potisk pete, stoja na prstih (ravno/pokrčeno koleno), gleženj z elastiko —
//    5× 30–45 s, pavza 60 s. Obvezne: 1, 3, 5, 6.
//  - Legs: bolgarski počep, enonožni RDL, enonožni most, dvigi na meča na
//    stopnici (ravno + pokrčeno koleno), izometrični izpadni korak — 3× 8–12.
//  - Core (10–15 min po lahkem teku): plank, stranski plank, dead bug.
//  - Do 15.3. 2× na teden (Tor + Čet), stopnjuj ponovitve.
// ============================================================

export const bazaZimaPlan: TrainingPlan = {
  id: 'baza-zima-2026',
  name: 'Baza (po Palmanovi)',
  raceDate: '2027-04-11',
  raceLocation: 'Bratislava maraton — blok se začne 28.12.',
  targetPace: '4:40',
  athlete: 'Tim Šfiligoj',
  goal: 'Regeneracija po Palmanovi, izometrija, nato nazaj na ~50 km/teden pred začetkom maratonskega bloka.',
  weeks: [
    {
      week: 1,
      title: '30. nov – 6. dec',
      phase: 'TEDEN 1: REGENERACIJA',
      focus: 'Po tekmi samo lahko, najprej se pozdravi prehlad. Izometrija od četrtka. ~24 km',
      startDate: '2026-11-30',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'rest', workout: 'Počitek ali sprehod.' },
        { day: 'Sre', type: 'easy', workout: '6 km zelo lahko (HR ≤145).' },
        { day: 'Čet', type: 'strength', workout: 'Izometrija.' },
        { day: 'Pet', type: 'easy', workout: '8 km lahko. Izometrija.' },
        { day: 'Sob', type: 'strength', workout: 'Izometrija.' },
        { day: 'Ned', type: 'easy', workout: '10 km lahko. Izometrija.' },
      ],
    },
    {
      week: 2,
      title: '7. dec – 13. dec',
      phase: 'TEDEN 2: LAHKO + PRVA MOČ',
      focus: 'Še vedno samo lahki teki. Izometrija + prve vaje za moč (Tor, Čet, Sob). ~38 km',
      startDate: '2026-12-07',
      days: [
        { day: 'Pon', type: 'strength', workout: 'Izometrija.' },
        { day: 'Tor', type: 'easy', workout: '8 km lahko + 6× strides. Izometrija + Legs.' },
        { day: 'Sre', type: 'easy', workout: '8 km lahko. Core.' },
        { day: 'Čet', type: 'strength', workout: 'Izometrija + Legs.' },
        { day: 'Pet', type: 'easy', workout: '8 km lahko. Izometrija.' },
        { day: 'Sob', type: 'strength', workout: 'Izometrija + Legs.' },
        { day: 'Ned', type: 'long', workout: '14 km lahko.' },
      ],
    },
    {
      week: 3,
      title: '14. dec – 20. dec',
      phase: 'TEDEN 3: NAZAJ V RITEM',
      focus: 'Prvi hitri deli (fartlek). Moč 2× na teden. ~44 km',
      startDate: '2026-12-14',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: 'Fartlek ~10 km: 3 km lahko + 8× (1 min hitro ~4:00 / 1 min lahko) + 2 km lahko. Legs + Core.' },
        { day: 'Sre', type: 'easy', workout: '8 km lahko. Core.' },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Pet', type: 'easy', workout: '10 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: '16 km lahko.' },
      ],
    },
    {
      week: 4,
      title: '21. dec – 27. dec',
      phase: 'TEDEN 4: PRAZNIKI',
      focus: 'Prazniki — dneve prosto premikaj, pomembna sta Tor in Ned. ~48 km',
      startDate: '2026-12-21',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: '~11 km: 2 km WU + 5× 3 min @ 4:00 (p 2 min) + 2 km CD. Legs + Core.' },
        { day: 'Sre', type: 'easy', workout: '9 km lahko. Core.' },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Pet', type: 'easy', workout: '10 km lahko + 4× strides.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'long', workout: '18 km lahko.' },
      ],
    },
  ],
  raceStrategy: { pacing: [], nutrition: [] },
  hrZones: {
    z1: { range: '< 140 bpm', purpose: 'Regeneracija' },
    z2: { range: '140-150 bpm', purpose: 'Lahki in dolgi teki' },
    z3: { range: '151-169 bpm', purpose: 'Siva cona' },
    z4: { range: '170-180 bpm', purpose: 'Tempo / HM' },
    z5: { range: '> 180 bpm', purpose: 'Intervali' },
  },
  paceZones: {
    easy: '5:15-5:45 /km',
    long: '5:10-5:30 /km',
    threshold: '4:00-4:05 /km',
  },
};
