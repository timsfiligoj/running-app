# Tekaški Načrt - Istrski Polmaraton 2026

Aplikacija za sledenje 11-tedenskemu programu priprave na Istrski polmaraton s ciljem sub-1:35 (4:30/km).

## Demo

**https://timsfiligoj.github.io/running-app/**

## Funkcionalnosti

### Sledenje treningom
- **Accordion prikaz po tednih** - klikni za razširitev/zaprtje
- **Označevanje treningov** - checkbox za "opravljeno" ✅
- **Izpuščeni treningi** - označi treninge, ki si jih moral preskočiti (bolezen, poškodba) z rdečim X
- **Zamenjava treningov** - premakni trening na drug dan v tednu (npr. če dežuje) - zamenja opis, tip aktivnosti in tip teka
- **Urejanje opisov** - zabeleži kaj si dejansko naredil (lahko tudi prazen opis)

### Vizualizacija napredka
- **Progress bar** - vizualni prikaz napredka (samo opravljeni treningi, ne izpuščeni)
- **Status tedna** - barvna oznaka glede na opravljen teden:
  - 🟢 Zelen - 100% opravljen
  - 🟡 Rumen - delno opravljen (nekateri izpuščeni)
  - 🔴 Rdeč - vsi treningi izpuščeni
- **Tedenski km** - prikaz skupne razdalje v glavi accordion-a
- **Dinamično štetje** - upošteva uporabnikovo izbiro počitka (ne samo načrtovani tip)

### Podrobnosti treningov
- **Tip aktivnosti** - tek, moč, počitek, drugo
- **Tip teka** - lahek, tempo, intervali, dolg, klanci, test, tekma
- **Razdalja (km)** - vpiši ali uvozi iz Strave
- **Trajanje** - format H:MM:SS ali MM:SS
- **Povprečni srčni utrip** - za analizo intenzivnosti
- **Komentar** - dodatne opombe
- **Strava URL** - povezava do aktivnosti

### Integracije
- **Strava integracija** - avtomatski uvoz podatkov iz Strava aktivnosti (razdalja, čas)
- **Real-time sinhronizacija** - deli napredek z drugimi (Supabase)

### Ostalo
- **Barvne oznake** - vsak tip treninga ima svojo barvo
- **Strategija za tekmo** - tempo in prehrana na dnu strani

## Barvna legenda

| Tip | Barva |
|-----|-------|
| Intervali | 🔴 Rdeča |
| Tempo | 🟡 Rumena |
| Lahek tek | 🟢 Zelena |
| Dolgi tek | 🔵 Modra |
| Klanci | 🟠 Oranžna |
| Moč | 🟣 Vijolična |
| Počitek | ⚪ Siva |
| Test | 🩷 Roza |
| Tekma | 🥇 Zlata |

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Real-time)
- **Hosting**: GitHub Pages

## Lokalni razvoj

```bash
# Namesti odvisnosti
npm install

# Zaženi dev server
npm run dev

# Build za produkcijo
npm run build
```

## Supabase Setup

Tabela `workout_progress`:

```sql
CREATE TABLE workout_progress (
  id TEXT PRIMARY KEY,
  completed BOOLEAN DEFAULT FALSE,
  skipped BOOLEAN DEFAULT FALSE,
  actual_workout TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE workout_progress;
ALTER TABLE workout_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON workout_progress FOR ALL USING (true);
```

## Struktura projekta

```
src/
├── components/
│   ├── ProgressBar.tsx      # Progress bar
│   ├── WeekAccordion.tsx    # Accordion za tedne
│   ├── WorkoutItem.tsx      # Posamezen trening
│   └── RaceStrategy.tsx     # Strategija za tekmo
├── data/
│   └── trainingPlan.ts      # Podatki načrta
├── lib/
│   ├── supabase.ts          # Supabase client
│   └── strava.ts            # Strava API helper
├── App.tsx                  # Glavna komponenta
├── main.tsx                 # Entry point
├── index.css                # Tailwind CSS
└── types.ts                 # TypeScript tipi
```

## Avtor

Tim Šfiligoj

---

*Priprava na Istrski polmaraton 2026 - Cilj: sub-1:35*
