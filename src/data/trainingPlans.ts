import { TrainingPlan } from '../types';

export const istrskiPlan: TrainingPlan = {
  "id": "istrski-2026",
  "name": "26. Istrski polmaraton",
  "raceDate": "2026-04-12",
  "raceLocation": "Koper, Slovenija",
  "raceUrl": "https://istrski-maraton.si/",
  "targetPace": "4:30",
  "athlete": "Tim Šfiligoj",
  "goal": "Istrski polmaraton 12. april 2026 - sub 1:35 (4:30/km) ✅ 1:33:33",
  "weeks": [
    {
      "week": 1,
      "title": "26. jan - 1. feb",
      "phase": "FAZA 1: GRADNJA BAZE + KLANCI",
      "focus": "Vstop v program, polarizacija, klanci na dolgem teku",
      "startDate": "2026-01-26",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min): Počepi 3x12, Izpadni koraki 3x10/noga, Dvigi na prste 3x15, Plank 3x30s, Enonožna stoja 3x20s/noga" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje Z2 + 5x 1000m @ 4:10/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30-6:00/km, HR POD 140 bpm!" },
        { "day": "Čet", "type": "strength", "workout": "Moč nog doma (30 min): počepi, izpadni koraki, dvigi na prste, plank" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 20 min @ 4:35/km (HM tempo) + 10 min ohlajanje" },
        { "day": "Sob", "type": "rest", "workout": "Regeneracija: raztezanje, foam roller, lahka mobilnost" },
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
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min): Počepi 3x12, Box jumps 3x8, Izpadni koraki 3x10/noga, Dvigi na prste 3x15, Plank 3x40s" },
        { "day": "Tor", "type": "hills", "workout": "Klanci (ZMERNO): 10 min ogrevanje + 6x 400m klanec @ 70-80% napora (odmor hoja dol) + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30-6:00/km, HR POD 140 bpm!" },
        { "day": "Čet", "type": "rest", "workout": "Regeneracija: raztezanje, foam roller (klanci = moč nog!)" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 25 min @ 4:35/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "strength", "workout": "Moč - lažje (20 min): Enonožni počepi 2x8/noga, Stranski plank 2x25s/stran, Stabilnost gležnja 2x15/noga" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 18 km @ 5:15-5:30/km na hriboviti trasi" }
      ]
    },
    {
      "week": 3,
      "title": "9. feb - 15. feb",
      "phase": "FAZA 1: GRADNJA BAZE + KLANCI",
      "focus": "Močnejši intervali in tempo tek",
      "startDate": "2026-02-09",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min): Počepi s skokom 3x8, Izpadni koraki s skokom 3x8/noga, Box jumps 3x10, Dvigi na prste 3x15, Plank 3x45s" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje + 5x 1000m @ 4:08/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 10 km @ 5:30-6:00/km, HR POD 140 bpm!" },
        { "day": "Čet", "type": "hills", "workout": "Klanci: 10 min ogrevanje + 8x 400m klanec @ hard effort + 10 min ohlajanje" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 25 min @ 4:32/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "rest", "workout": "Regeneracija (klanci = dovolj moči za noge ta teden!)" },
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
        { "day": "Pon", "type": "rest", "workout": "Lahka mobilnost, raztezanje (deload teden!)" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje + 4x 1000m @ 4:10/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 6 km @ 5:30-6:00/km" },
        { "day": "Čet", "type": "strength", "workout": "Moč - LAHKA (15 min): Počepi 2x10, Plank 2x30s, Enonožna stoja 2x15s/noga, Raztezanje" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 15 min @ 4:35/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "rest", "workout": "Počitek" },
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
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min): Počepi s skokom 3x10, Izpadni koraki 3x10/noga, Box jumps 3x10, Dvigi na prste 3x20, Plank 3x45s" },
        { "day": "Tor", "type": "intervals", "workout": "HM intervali: 10 min ogrevanje + 4x 2000m @ 4:25/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30-6:00/km" },
        { "day": "Čet", "type": "strength", "workout": "Moč + core (25 min): Enonožni počepi 2x10/noga, Stranski plank 2x30s/stran, Bird-dog 2x12/stran, Stabilnost gležnja 2x15/noga" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 6 km @ 4:30/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "rest", "workout": "Regeneracija" },
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
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min): Počepi 3x12, Izpadni koraki s skokom 3x8/noga, Box jumps 3x10, Dvigi na prste 3x20, Plank 3x50s" },
        { "day": "Tor", "type": "hills", "workout": "Klanci: 10 min ogrevanje + 6x 500m klanec @ hard + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 8 km @ 5:40/km" },
        { "day": "Čet", "type": "rest", "workout": "Lahka mobilnost (klanci = moč nog!)" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo blok: 10 min ogrevanje + 8 km @ 4:30/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "strength", "workout": "Moč - lažje (20 min): Enonožni počepi 2x8/noga, Plank 2x40s, Stabilnost gležnja 2x15/noga" },
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
        { "day": "Pon", "type": "strength", "workout": "Moč nog (30 min): Počepi 3x12, Izpadni koraki 3x10/noga, Dvigi na prste 3x20, Plank 3x50s, Stranski plank 2x30s/stran" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje + 5x 1600m @ 4:20/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 6 km @ 5:40/km" },
        { "day": "Čet", "type": "strength", "workout": "Moč + core (25 min): Enonožni počepi 2x10/noga, Bird-dog 2x12/stran, Stabilnost gležnja 2x15/noga, Raztezanje" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 6 km @ 4:28/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "rest", "workout": "Regeneracija" },
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
        { "day": "Pon", "type": "strength", "workout": "Moč - LAHKA (15 min): Počepi 2x10, Plank 2x30s, Stabilnost gležnja 2x10/noga (priprava na test!)" },
        { "day": "Tor", "type": "test", "workout": "⭐ TESTNI TRENING: 10 min ogrevanje + 10-12 km @ 4:28-4:30/km + 10 min ohlajanje. KLJUČNO: zadnja 2 km ne smeš razpasti!" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 6 km @ 5:40/km (regeneracija po testu)" },
        { "day": "Čet", "type": "rest", "workout": "Počitek ali 20 min lahek tek + raztezanje" },
        { "day": "Pet", "type": "easy", "workout": "Lahek tek: 8 km @ 5:40/km" },
        { "day": "Sob", "type": "rest", "workout": "Regeneracija" },
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
        { "day": "Pon", "type": "strength", "workout": "Moč nog (25 min): Počepi 3x10, Izpadni koraki 3x8/noga, Dvigi na prste 3x15, Plank 3x40s" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje + 6x 1000m @ 4:15/km (odmor 2:30) + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30/km" },
        { "day": "Čet", "type": "strength", "workout": "Moč + core (20 min): Enonožni počepi 2x8/noga, Stranski plank 2x25s/stran, Stabilnost gležnja 2x12/noga" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo blok: 10 min ogrevanje + 10 km @ 4:30/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "rest", "workout": "Regeneracija" },
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
        { "day": "Pon", "type": "strength", "workout": "Moč - ZELO LAHKA (15 min): Počepi 2x8, Dvigi na prste 2x10, Plank 2x30s, Raztezanje (taper!)" },
        { "day": "Tor", "type": "intervals", "workout": "Kratki intervali: 10 min ogrevanje + 5x 600m @ 4:10/km (odmor 2:30) + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 5 km @ 5:40/km" },
        { "day": "Čet", "type": "rest", "workout": "Lahka mobilnost, raztezanje (taper!)" },
        { "day": "Pet", "type": "tempo", "workout": "HM simulacija: 10 min ogrevanje + 6 km @ 4:28/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "rest", "workout": "Počitek" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 14 km @ 5:20/km" }
      ]
    },
    {
      "week": 11,
      "title": "6. apr - 12. apr",
      "phase": "FAZA 4: TAPER",
      "focus": "🏃 TEKMA TEDEN",
      "startDate": "2026-04-06",
      "days": [
        { "day": "Pon", "type": "rest", "workout": "Počitek ali lahka mobilnost (brez moči - tekma teden!)" },
        { "day": "Tor", "type": "activation", "workout": "Aktivacija: 6 km skupaj, vključno z 3x 1 km @ 4:25/km (odmor 2 min)" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 4 km @ 5:40/km + 4x 100m strides" },
        { "day": "Čet", "type": "rest", "workout": "Počitek ali 20 min lahek tek" },
        { "day": "Pet", "type": "easy", "workout": "Lahek tek: 4 km @ 5:40/km + 4x 100m strides" },
        { "day": "Sob", "type": "easy", "workout": "Shakeout: 3 km lahek tek + 2x 100m strides. Hidracija! Priprava opreme." },
        { "day": "Ned", "type": "race", "workout": "🏃 ISTRSKI POLMARATON - Cilj: sub-1:35 (4:30/km)" }
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

export const tekTrojkPlan: TrainingPlan = {
  "id": "tek-trojk-2026",
  "name": "Tek trojk Ljubljana",
  "raceDate": "2026-05-09",
  "raceLocation": "Ljubljana, Slovenija",
  "raceUrl": "",
  "targetPace": "4:35",
  "athlete": "Tim Šfiligoj",
  "goal": "Tek trojk 9. maj 2026 - 20 km s 350 m vzpona (4 km vzpon med 7. in 11. km)",
  "weeks": [
    {
      "week": 1,
      "title": "13. apr - 19. apr",
      "phase": "FAZA 0: REGENERACIJA",
      "focus": "Regeneracija po Istrskem polmaratonu (1:33:33) - le lahki teki",
      "startDate": "2026-04-13",
      "days": [
        { "day": "Pon", "type": "rest", "workout": "Popolni počitek (dan po polmaratonu)" },
        { "day": "Tor", "type": "easy", "workout": "Lahek tek: 10 km @ 5:30-6:00/km, HR pod 140 bpm (prva regeneracijska pretekanja)" },
        { "day": "Sre", "type": "rest", "workout": "Mobilnost, raztezanje, foam roller" },
        { "day": "Čet", "type": "rest", "workout": "Lahek sprehod ali počitek" },
        { "day": "Pet", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30-6:00/km, HR pod 140 bpm" },
        { "day": "Sob", "type": "rest", "workout": "Regeneracija" },
        { "day": "Ned", "type": "long", "workout": "Lahek dolgi: 12 km @ 5:30-5:45/km, brez siljenja - test kako se počutijo noge" }
      ]
    },
    {
      "week": 2,
      "title": "20. apr - 26. apr",
      "phase": "FAZA 1: GRADNJA + VRNITEV MOČI",
      "focus": "Vrnitev na ustaljen ritem + vrnitev moči nog, blaga progresija",
      "startDate": "2026-04-20",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (25 min - BLAGA VRNITEV): Počepi 3x10, Izpadni koraki 3x8/noga, Dvigi na prste 3x15, Plank 3x40s, Enonožna stoja 3x20s/noga" },
        { "day": "Tor", "type": "intervals", "workout": "Intervali: 10 min ogrevanje + 5x 1000m @ 4:10/km (odmor 3 min) + 10 min ohlajanje" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30-6:00/km, HR pod 140 bpm" },
        { "day": "Čet", "type": "strength", "workout": "Moč + core (20 min): Stranski plank 2x30s/stran, Bird-dog 2x12/stran, Stabilnost gležnja 2x15/noga, Raztezanje" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 20 min @ 4:30/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "rest", "workout": "Regeneracija" },
        { "day": "Ned", "type": "long", "workout": "Dolgi tek: 16 km @ 5:15-5:30/km na HRIBOVITI trasi (klance tecimo mirno, fokus na vzdržljivost)" }
      ]
    },
    {
      "week": 3,
      "title": "27. apr - 3. maj",
      "phase": "FAZA 2: KLANCI + RAZDALJA (PEAK)",
      "focus": "Specifično za traso: dolgi klanec + razdalja - simulacija 4 km vzpona",
      "startDate": "2026-04-27",
      "days": [
        { "day": "Pon", "type": "strength", "workout": "Moč nog (25 min): Počepi s skokom 3x8, Izpadni koraki 3x10/noga, Box jumps 3x8, Dvigi na prste 3x15, Plank 3x45s" },
        { "day": "Tor", "type": "hills", "workout": "KLANCI (dolgi): 10 min ogrevanje + 4x 1 km klanec @ HM napor (odmor lahek tek dol) + 10 min ohlajanje. Simulira 4 km vzpon na tekmi!" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 8 km @ 5:30-5:45/km, HR pod 145 bpm" },
        { "day": "Čet", "type": "strength", "workout": "Moč + core (20 min): Enonožni počepi 2x8/noga, Stranski plank 2x30s/stran, Stabilnost gležnja 2x15/noga" },
        { "day": "Pet", "type": "tempo", "workout": "Tempo: 10 min ogrevanje + 6 km @ 4:30/km + 10 min ohlajanje" },
        { "day": "Sob", "type": "rest", "workout": "Regeneracija" },
        { "day": "Ned", "type": "long", "workout": "⭐ DOLGI TEK SIMULACIJA: 20 km @ 5:10-5:20/km na hriboviti trasi (~300 m vzpona). To je razdalja tekme!" }
      ]
    },
    {
      "week": 4,
      "title": "4. maj - 10. maj",
      "phase": "FAZA 3: TAPER + TEKMA",
      "focus": "🏃 TEKMA TEDEN - svež na start",
      "startDate": "2026-05-04",
      "days": [
        { "day": "Pon", "type": "rest", "workout": "Počitek ali lahka mobilnost (brez moči - tekma teden!)" },
        { "day": "Tor", "type": "activation", "workout": "Aktivacija: 6 km skupaj, vključno z 3x 1 km @ 4:25/km (odmor 2 min)" },
        { "day": "Sre", "type": "easy", "workout": "Lahek tek: 5 km @ 5:40/km + 4x 100m strides" },
        { "day": "Čet", "type": "rest", "workout": "Počitek ali 20 min lahek tek" },
        { "day": "Pet", "type": "easy", "workout": "Shakeout: 3 km lahek tek + 2x 100m strides. Hidracija! Priprava opreme." },
        { "day": "Sob", "type": "race", "workout": "🏃 TEK TROJK - 20 km, 350 m vzpona. Cilj: ohraniti hitrost, preživeti 4 km vzpon med km 7-11, iztočnica na zadnjih 9 km." },
        { "day": "Ned", "type": "rest", "workout": "Regeneracija po tekmi - sprehod, raztezanje" }
      ]
    }
  ],
  "raceStrategy": {
    "pacing": [
      { "section": "Km 1-7", "instruction": "Mirno @ 4:30-4:40/km. NE žgati pred klancem - prihranitve za vzpon." },
      { "section": "Km 7-11 (VZPON)", "instruction": "4 km konstantnega vzpona - po naporu, ne po tempu. Enakomeren ritem, kratki koraki, stabilen zgornji del telesa." },
      { "section": "Km 11-20", "instruction": "Po vzponu: poiskati ritem nazaj, zadnjih 5 km pospešiti če imaš rezervo." }
    ],
    "nutrition": [
      { "when": "Dan prej", "what": "Ogljikovi hidrati (testenine, riž). Brez vlaknin in eksperimentov." },
      { "when": "Zajtrk", "what": "2-3 ure pred startom. Toast, banana, kava - kar poznaš." },
      { "when": "Med tekmo", "what": "Voda/izotonična na vsakih 5 km. Gel pred vzponom (km 6-7)." }
    ]
  },
  "hrZones": {
    "z1": { "range": "< 139 bpm", "purpose": "Regeneracija" },
    "z2": { "range": "140-155 bpm", "purpose": "Aerobna baza (lahki teki)" },
    "z3": { "range": "156-170 bpm", "purpose": "IZOGIBAJ SE - siva cona!" },
    "z4": { "range": "171-185 bpm", "purpose": "Tempo / Prag (intervali, vzponi)" },
    "z5": { "range": "> 186 bpm", "purpose": "VO2max (kratki intervali)" }
  },
  "paceZones": {
    "easy": "5:30-6:00 /km",
    "long": "5:10-5:30 /km",
    "hmTempo": "4:25-4:35 /km",
    "threshold": "4:05-4:15 /km",
    "vo2max": "3:40-3:50 /km"
  }
};

export const trainingPlans: TrainingPlan[] = [tekTrojkPlan, istrskiPlan];
