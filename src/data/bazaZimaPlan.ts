import { TrainingPlan } from '../types';

// ============================================================
// Baza po Palmanovi — 30.11.2026 → 27.12.2026, 4 tedni
//
// Most med Palmanovo in blokom za Bratislavo (začne se Pon 28.12.).
// Po dogovoru z Jakobom Cigaletom (dopolnitev 24.11.):
//  1. 30.11.–6.12.: čisti počitek, tudi brez izometrije.
//  2. 7.12.–13.12.: izometrija vsak dan 1–2×, nedelja prosto. Brez teka.
//  3. 14.12.–20.12.: 5 tekov, izometrija vsak dan 1–2×, nedelja prosto.
//  4. Od 21.12. do začetka/sredine februarja: tek po planu, moč 3× na teden
//     (Tor, Čet, Sob). Vsak teden +2 ponovitvi; pri 12 nazaj na 8 in breme
//     največ +5 kg. Če je 3× preveč → 2×. Tek ima prednost pred močjo.
//
// Izometrija (5× 30–45 s, pavza 60 s; obvezne 1, 3, 5, 6): wall sit, potisk
// žoge v steno, most, potisk pete, stoja na prstih (ravno/pokrčeno koleno),
// gleženj z elastiko.
// Legs: bolgarski počep, enonožni RDL, enonožni most, dvigi na meča na stopnici
// (ravno + pokrčeno koleno), izometrični izpadni korak — 3× 8–12.
// Core (10–15 min po lahkem teku): plank, stranski plank, dead bug.
// ============================================================

export const bazaZimaPlan: TrainingPlan = {
  id: 'baza-zima-2026',
  name: 'Baza (po Palmanovi)',
  raceDate: '2027-04-11',
  raceLocation: 'Bratislava maraton — blok se začne 28.12.',
  targetPace: '4:40',
  athlete: 'Tim Šfiligoj',
  goal: 'Teden čistega počitka, teden izometrije, nato postopen povratek teka in moč 3× na teden pred začetkom maratonskega bloka.',
  weeks: [
    {
      week: 1,
      title: '30. nov – 6. dec',
      phase: 'TEDEN 1: ČISTI POČITEK',
      focus: 'Telo rabi počitek po naporni jeseni. Brez teka in brez izometrije.',
      startDate: '2026-11-30',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'rest', workout: 'Počitek.' },
        { day: 'Sre', type: 'rest', workout: 'Počitek.' },
        { day: 'Čet', type: 'rest', workout: 'Počitek.' },
        { day: 'Pet', type: 'rest', workout: 'Počitek.' },
        { day: 'Sob', type: 'rest', workout: 'Počitek.' },
        { day: 'Ned', type: 'rest', workout: 'Počitek.' },
      ],
    },
    {
      week: 2,
      title: '7. dec – 13. dec',
      phase: 'TEDEN 2: IZOMETRIJA',
      focus: 'Izometrija vsak dan 1–2×, nedelja prosto. Še brez teka.',
      startDate: '2026-12-07',
      days: [
        { day: 'Pon', type: 'strength', workout: 'Izometrija.' },
        { day: 'Tor', type: 'strength', workout: 'Izometrija.' },
        { day: 'Sre', type: 'strength', workout: 'Izometrija.' },
        { day: 'Čet', type: 'strength', workout: 'Izometrija.' },
        { day: 'Pet', type: 'strength', workout: 'Izometrija.' },
        { day: 'Sob', type: 'strength', workout: 'Izometrija.' },
        { day: 'Ned', type: 'rest', workout: 'Prosto.' },
      ],
    },
    {
      week: 3,
      title: '14. dec – 20. dec',
      phase: 'TEDEN 3: ZAČETEK TEKA',
      focus: '5 kratkih lahkih tekov, izometrija vsak dan, nedelja prosto. ~31 km',
      startDate: '2026-12-14',
      days: [
        { day: 'Pon', type: 'easy', workout: '5 km zelo lahko (HR ≤145).', extra: [{ type: 'strength', workout: 'Izometrija.' }] },
        { day: 'Tor', type: 'easy', workout: '6 km lahko.', extra: [{ type: 'strength', workout: 'Izometrija.' }] },
        { day: 'Sre', type: 'easy', workout: '6 km lahko.', extra: [{ type: 'strength', workout: 'Izometrija.' }] },
        { day: 'Čet', type: 'strength', workout: 'Izometrija.' },
        { day: 'Pet', type: 'easy', workout: '6 km lahko + 4× strides.', extra: [{ type: 'strength', workout: 'Izometrija.' }] },
        { day: 'Sob', type: 'easy', workout: '8 km lahko.', extra: [{ type: 'strength', workout: 'Izometrija.' }] },
        { day: 'Ned', type: 'rest', workout: 'Prosto.' },
      ],
    },
    {
      week: 4,
      title: '21. dec – 27. dec',
      phase: 'TEDEN 4: BAZA — MOČ 3×',
      focus: 'Prazniki, dneve prosto premikaj. Moč 3× na teden: vsak teden +2 ponovitvi, pri 12 nazaj na 8 in breme +do 5 kg. ~40 km',
      startDate: '2026-12-21',
      days: [
        { day: 'Pon', type: 'rest', workout: 'Počitek.' },
        { day: 'Tor', type: 'intervals', workout: 'Fartlek ~10 km: 3 km lahko + 8× (1 min hitro ~4:00 / 1 min lahko) + 2 km lahko.', extra: [{ type: 'strength', workout: 'Legs + Core.' }] },
        { day: 'Sre', type: 'easy', workout: '8 km lahko.', extra: [{ type: 'strength', workout: 'Core.' }] },
        { day: 'Čet', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Pet', type: 'easy', workout: '8 km lahko + 4× strides.' },
        { day: 'Sob', type: 'strength', workout: 'Legs + Core.' },
        { day: 'Ned', type: 'long', workout: '14 km lahko.' },
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
