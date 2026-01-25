import { TrainingPlan } from '../types';

export const trainingPlan: TrainingPlan = {
  "athlete": "Tim Šfiligoj",
  "goal": "Istrski polmaraton 12. april 2026 - sub 1:35 (4:30/km)",
  "weeks": [
    {
      "week": 1,
      "title": "26. jan - 1. feb",
      "phase": "FAZA 1: GRADNJA BAZE + KLANCI",
      "focus": "Vstop v program, polarizacija, klanci na dolgem teku",
      "startDate": "2026-01-26",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog doma (30 min): počepi, izpadni koraki, dvigi na prste, plank, stabilnost gležnja" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje Z2 + 5x 1000m @ 4:10/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "strength", "workout": "Moč nog + core (30 min): fokus na stabilnost gležnja, enonožni počepi" },
        { "day": "Čet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 20 min @ 4:35/km (HM tempo) + 10 min ohlajanje" },
        { "day": "Pet", "type": "rest", "workout": "Regeneracija: raztezanje, foam roller, lahka mobilnost" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30-6:00/km, HR POD 140 bpm!" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 16 km @ 5:15-5:30/km na HRIBOVITI trasi - klance teči počasi, ne siliti" }
      ]
    },
    {
      "week": 2,
      "title": "2. feb - 8. feb",
      "phase": "FAZA 1: GRADNJA BAZE + KLANCI",
      "focus": "Uvedba klančnih intervalov (70-80% napora)",
      "startDate": "2026-02-02",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min): počepi s skoki, box jumps, izpadni koraki" },
        { "day": "Tor", "type": "hills", "workout": "Klanci (ZMERNO): 10 min ogrevanje + 6x 400m klanec @ 70-80% napora (odmor hoja dol) + 10 min ohlajanje" },
        { "day": "Sre", "type": "strength", "workout": "Moč nog + core (30 min)" },
        { "day": "Čet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 25 min @ 4:35/km + 10 min ohlajanje" },
        { "day": "Pet", "type": "rest", "workout": "Regeneracija: raztezanje, foam roller" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30-6:00/km, HR POD 140 bpm!" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 18 km @ 5:15-5:30/km na hriboviti trasi" }
      ]
    },
    {
      "week": 3,
      "title": "9. feb - 15. feb",
      "phase": "FAZA 1: GRADNJA BAZE + KLANCI",
      "focus": "Polna intenzivnost klancev",
      "startDate": "2026-02-09",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min): eksplozivne vaje, pliometrija" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje + 5x 1000m @ 4:08/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "strength", "workout": "Moč nog + core (30 min)" },
        { "day": "Čet", "type": "hills", "workout": "Klanci: 10 min ogrevanje + 8x 400m klanec @ hard effort + 10 min ohlajanje" },
        { "day": "Pet", "type": "rest", "workout": "Regeneracija" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 10 km @ 5:30-6:00/km, HR POD 140 bpm!" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 20 km @ 5:15-5:30/km, zadnjih 5 km @ 4:45/km (progresivni)" }
      ]
    },
    {
      "week": 4,
      "title": "16. feb - 22. feb",
      "phase": "FAZA 1: GRADNJA BAZE + KLANCI",
      "focus": "Regeneracijski teden (deload)",
      "startDate": "2026-02-16",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog - lažje (20 min)" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje + 4x 1000m @ 4:10/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "rest", "workout": "Lahka mobilnost, raztezanje" },
        { "day": "Čet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 15 min @ 4:35/km + 10 min ohlajanje" },
        { "day": "Pet", "type": "rest", "workout": "Počitek" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 6 km @ 5:30-6:00/km" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 14 km @ 5:20/km (brez pospeševanja)" }
      ]
    },
    {
      "week": 5,
      "title": "23. feb - 1. mar",
      "phase": "FAZA 2: HM SPECIFIKA",
      "focus": "Daljši tempo bloki",
      "startDate": "2026-02-23",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min): eksplozivnost" },
        { "day": "Tor", "type": "intervals", "workout": "HM intervali: 10 min ogrevanje + 4x 2000m @ 4:25/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "strength", "workout": "Moč nog + core (30 min)" },
        { "day": "Čet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 6 km @ 4:30/km + 10 min ohlajanje" },
        { "day": "Pet", "type": "rest", "workout": "Regeneracija" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30-6:00/km" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 20 km @ 5:15/km, zadnjih 4 km @ 4:45/km" }
      ]
    },
    {
      "week": 6,
      "title": "2. mar - 8. mar",
      "phase": "FAZA 2: HM SPECIFIKA",
      "focus": "Vzdržljivost na tempu",
      "startDate": "2026-03-02",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min)" },
        { "day": "Tor", "type": "tempo", "workout": "Tempo blok: 10 min ogrevanje + 8 km @ 4:30/km + 10 min ohlajanje" },
        { "day": "Sre", "type": "strength", "workout": "Moč nog + core (30 min)" },
        { "day": "Čet", "type": "hills", "workout": "Klanci: 10 min ogrevanje + 6x 500m klanec @ hard + 10 min ohlajanje" },
        { "day": "Pet", "type": "rest", "workout": "Lahka mobilnost" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 8 km @ 5:40/km" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 22 km @ 5:10/km, zadnjih 5 km @ 4:45/km" }
      ]
    },
    {
      "week": 7,
      "title": "9. mar - 15. mar",
      "phase": "FAZA 2: HM SPECIFIKA",
      "focus": "Gradnja proti testu",
      "startDate": "2026-03-09",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min)" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje + 5x 1600m @ 4:20/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "strength", "workout": "Moč nog + core (30 min)" },
        { "day": "Čet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 6 km @ 4:28/km + 10 min ohlajanje" },
        { "day": "Pet", "type": "rest", "workout": "Regeneracija" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 6 km @ 5:40/km" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 18 km @ 5:15/km" }
      ]
    },
    {
      "week": 8,
      "title": "16. mar - 22. mar",
      "phase": "FAZA 2: HM SPECIFIKA",
      "focus": "⭐ TESTNI TEDEN",
      "startDate": "2026-03-16",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog - lažje (20 min)" },
        { "day": "Tor", "type": "test", "workout": "⭐ TESTNI TRENING: 10 min ogrevanje + 10-12 km @ 4:28-4:30/km + 10 min ohlajanje. KLJUČNO: zadnja 2 km ne smeš razpasti!" },
        { "day": "Sre", "type": "rest", "workout": "Počitek ali 20 min lahek tek" },
        { "day": "Čet", "type": "easy", "workout": "Lahek tek: 8 km @ 5:40/km (regeneracija po testu)" },
        { "day": "Pet", "type": "rest", "workout": "Regeneracija" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 6 km @ 5:40/km" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 24 km @ 5:15/km (najdaljši tek programa!)" }
      ]
    },
    {
      "week": 9,
      "title": "23. mar - 29. mar",
      "phase": "FAZA 3: PRED-TAPER",
      "focus": "Zadnji trdi teden",
      "startDate": "2026-03-23",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (25 min)" },
        { "day": "Tor", "type": "tempo", "workout": "Tempo blok: 10 min ogrevanje + 10 km @ 4:30/km + 10 min ohlajanje" },
        { "day": "Sre", "type": "strength", "workout": "Moč nog + core (25 min)" },
        { "day": "Čet", "type": "intervals", "workout": "Intervali: 10 min ogrevanje + 6x 1000m @ 4:15/km (odmor 2:30) + 10 min ohlajanje" },
        { "day": "Pet", "type": "rest", "workout": "Regeneracija" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30/km" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 20 km @ 5:15/km, zadnjih 4 km @ 4:40/km" }
      ]
    },
    {
      "week": 10,
      "title": "30. mar - 5. apr",
      "phase": "FAZA 4: TAPER",
      "focus": "Zmanjšan volumen, ohranjena intenzivnost",
      "startDate": "2026-03-30",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog - zelo lahka (15 min)" },
        { "day": "Tor", "type": "tempo", "workout": "HM simulacija: 10 min ogrevanje + 6 km @ 4:28/km + 10 min ohlajanje" },
        { "day": "Sre", "type": "rest", "workout": "Lahka mobilnost, raztezanje" },
        { "day": "Čet", "type": "intervals", "workout": "Kratki intervali: 10 min ogrevanje + 5x 600m @ 4:10/km (odmor 2:30) + 10 min ohlajanje" },
        { "day": "Pet", "type": "rest", "workout": "Počitek" },
        { "day": "Sob", "type": "easy", "workout": "Lahek tek: 5 km @ 5:40/km" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 14 km @ 5:20/km" }
      ]
    },
    {
      "week": 11,
      "title": "6. apr - 12. apr",
      "phase": "FAZA 4: TAPER",
      "focus": "🏁 TEKMA TEDEN",
      "startDate": "2026-04-06",
      "days": [
        { "day": "Pon", "type": "easy", "workout": "Lahek tek: 5 km @ 5:40/km + 4x 100m strides" },
        { "day": "Tor", "type": "activation", "workout": "Aktivacija: 6 km skupaj, vključno z 3x 1 km @ 4:25/km (odmor 2 min)" },
        { "day": "Sre", "type": "rest", "workout": "Počitek ali 20 min lahek tek" },
        { "day": "Čet", "type": "easy", "workout": "Lahek tek: 4 km @ 5:40/km + 4x 100m strides" },
        { "day": "Pet", "type": "rest", "workout": "Počitek. Priprava opreme. Zgodaj spat." },
        { "day": "Sob", "type": "easy", "workout": "Shakeout: 3 km lahek tek + 2x 100m strides. Hidracija!" },
        { "day": "Ned", "type": "race", "workout": "🏁 ISTRSKI POLMARATON - Cilj: sub-1:35 (4:30/km)" }
      ]
    }
  ],
  "raceStrategy": {
    "pacing": [
      { "section": "Km 1-5", "instruction": "Začni konzervativno @ 4:32-4:35/km. Ne ujeti se v evforijo starta!" },
      { "section": "Km 5-15", "instruction": "Usidri se na 4:28-4:30/km. NE pospeševati, tudi če se počutiš odlično." },
      { "section": "Km 15-21", "instruction": "Če imaš rezervo, pospeši na 4:25/km. Zadnja 2 km all-out." }
    ],
    "nutrition": [
      { "when": "Dan prej", "what": "Ogljikovi hidrati (testenine, riž). Brez vlaknin in eksperimentov." },
      { "when": "Zajtrk", "what": "3 ure pred startom. Toast, banana, kava - kar poznaš." },
      { "when": "Med tekmo", "what": "Voda/izotonična na vsakih 5 km. Gel na 10 km če uporabljaš." }
    ]
  },
  "hrZones": {
    "z1": { "range": "< 139 bpm", "purpose": "Regeneracija" },
    "z2": { "range": "140-155 bpm", "purpose": "Aerobna baza (lahki teki)" },
    "z3": { "range": "156-170 bpm", "purpose": "IZOGIBAJ SE - siva cona!" },
    "z4": { "range": "171-185 bpm", "purpose": "Tempo / Prag (intervali)" },
    "z5": { "range": "> 186 bpm", "purpose": "VO2max (kratki intervali)" }
  },
  "paceZones": {
    "easy": "5:30-6:00 /km",
    "long": "5:15-5:30 /km",
    "hmTempo": "4:25-4:35 /km",
    "threshold": "4:05-4:15 /km",
    "vo2max": "3:40-3:50 /km"
  }
};
