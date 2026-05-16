# HANDOFF: Running App v2 — Strava Ingest + Smart Suggesters

**Datum spec-a:** 16. maj 2026
**Avtor:** Claude (web planning session) + Tim
**Implementator:** Claude Code
**Status odločitev:** Vse spodaj LOCKED, razen označenih kot OPEN

---

## 0. Hitri uvod za Claude Code

Obstoječa aplikacija je React/Vite/Tailwind frontend na GitHub Pages + Supabase backend, ki jo Tim uporablja za beleženje tekov, AI analizo po treningu (gumb "Analiza"), in athletic profile pregled. Ta projekt **dodaja** naslednje featurje:

1. **Strava API ingest** — Tim prilepi URL aktivnosti, sistem fetcha podatke, parsa metrike, klasificira tip treninga, shrani v `runs` tabelo
2. **Auto workout classifier** — rule-based klasifikacija (pace variance, HR profile, lap struktura → workout_type + subtype) z manual override
3. **Editable phase config** — Tim lahko skozi UI ureja faze (F1-F5b), datume, pace targete, weekly volume targete
4. **Dynamic strength suggester** — constraint-based composer, ki na osnovi (a) difficulty inputa 1-5, (b) recent training context-a, (c) anatomske pokritosti, (d) trenutne faze izbere optimalen set vaj iz library
5. **Running suggester** — na osnovi (a) goal inputa, (b) opcionalne kategorije, (c) trenutne faze, (d) recovery state-a vrne strukturiran trening (warmup + main + cooldown z pace targeti)
6. **Coverage tracking UI** — tedenska BIG3 status widget + anatomska heatmap pokritosti

**Kritično:** NE poskušaj zgraditi vsega naenkrat. Sledi build order-ju v sekciji 12. Phase 1 = ingest + log + seed data; Phase 2 = coverage tracking; Phase 3 = suggesters; Phase 4 = polish + v2 featurji.

**Komunikacija s Tim:** Slovenščina. UI strings v Slovenščini. Code (variable names, comments, enums) v Angleščini. Notes/notes fields v UI dovoljeni Slovenski.

---

## 1. Kontekst tekača

**Profil:**
- Rojen 6.6.1992, lokacija blizu Logatca (Slovenija)
- Trening filozofija: polarized (~80% easy ≤140-145 bpm, ~20% hard, brez Zone 3 "no man's land")
- VO2max (Garmin): 57
- Gear: ASICS Megablast (daily), MetaSpeed Edge Paris/Tokyo (race), Garmin FR245 + HRM chest strap

**Trenutni PB-ji (maj 2026):**
- 5K: 20:55
- 10K: 42:33
- HM: 1:33:33 (Istrski polmaraton, 12.4.2026, negative split)
- Marathon: 3:47:50

**Cilji 2026 (Scenarij 1 izbran):**
- F4 jul-avg: **5K sub-20** + **10K sub-40** PB poskusi
- LJ Marathon HM (21km), 25.10.2026: B-race, controlled execution, target 1:30:30-1:31:30
- **Palmanova HM, 29.11.2026: A-race, sub-1:30**
- Maraton **NI** primarni cilj 2026; pomik primarnega maratona na pomlad 2027 (Dunaj/Praga/Zagreb)
- Strength prioriteta: phenomenal baza za sub-3h maraton napad 2028+

**Casual marathon LJ 25.10.2026** = odpade (konflikt z LJ HM B-race + recovery cost pred Palmanova).

---

## 2. Locked design decisions

| Odločitev | Vrednost | Razlog |
|---|---|---|
| Strava input mehanizem | URL paste (Tim prilepi URL aktivnosti, app fetcha) | Najmanj friction-a, ne potrebuje OAuth flow-a |
| Workout type classification | Auto (rule-based iz Strava metrik) z manual override v UI | Avtomatika za 80% primerov, override za edge cases |
| Phase config | Editable v UI (CRUD nad `phase_config` tabelo) | Race dates premikajo, F4/F5a boundaries Tim prilagaja |
| Strength session composition | **Dinamičen composer** iz exercise library z scoring algoritmom, NE template-based | Boljša variety, boljša anatomska pokritost, exercise library raste |
| Rationale generation | Rule-based string composition | Hitro, deterministično, ceneje od LLM call-a |
| Strength session difficulty | Input 1-5; sets/reps/RIR/duration izpeljani | Tim določi intenziteto, sistem optimizira preostalo |
| Running suggester input | `goal` (5k_pb/10k_pb/hm_pb/marathon_base/general) + opcionalno `category` | Cilj določa pace targete, kategorija je optional override |
| Tedenska struktura | Rotirajoči mid-week hard sesiji (NE fiksen koledar), fiksna sidra: long run vikend, 2 hard/teden, min 48h med, vsaj 2 easy dneva | Boljša adaptacija, manj plateau-a |
| Strength frekvenca | 3× tedensko medium v F2/F3/F5; 2× tedensko v F4 (freshnes za speed PB) | Optimalno za high-volume tekača |
| Komunikacijski jezik | UI strings Slovenščina; code Angleščina | Tim's preferenca |

---

## 3. Phase configuration (seed data)

Seed v `phase_config` tabelo. Vse vrednosti so editable iz UI po seedanju.

| phase_code | start | end | easy_hr_max | threshold_pace | vo2max_pace | hm_pace_target | weekly_vol_km | strength_freq | key_race |
|---|---|---|---|---|---|---|---|---|---|
| F1 | 2026-05-10 | 2026-05-23 | 145 | — | — | — | 35 | 2 | (recovery post-Istrski) |
| F2 | 2026-05-24 | 2026-06-14 | 145 | 4:15 | 4:00 | 4:20 | 55 | 3 | — |
| F3 | 2026-06-15 | 2026-07-12 | 145 | 4:10 | 4:00 | 4:15 | 60 | 3 | — |
| F4 | 2026-07-13 | 2026-08-09 | 145 | 4:05 | 3:55 | 4:10 | 55 | 2 | 5K/10K PB attempts |
| F5a | 2026-08-10 | 2026-10-18 | 145 | 4:15 | 4:00 | 4:15 | 65 | 3 | — |
| F5b-LJ | 2026-10-19 | 2026-10-25 | 145 | 4:15 | — | 4:15 | 45 | 2 | LJ HM 25.10. (B-race) |
| F5c | 2026-10-26 | 2026-11-22 | 145 | 4:15 | 4:00 | 4:14 | 60 | 3 | — |
| F5d-Palmanova | 2026-11-23 | 2026-11-29 | 145 | 4:15 | — | 4:14 | 40 | 1 | **Palmanova HM 29.11. (A-race)** |

**Phase auto-resolution rule:** trenutno fazo izračunaš iz `today` glede na `start`/`end` razpone v `phase_config`. Če `today` pade izven vseh razponov (npr. po Palmanova), default v "off_season" string-u (Tim ročno doda novo fazo).

---

## 4. Data model

### Tabela `runs`

```sql
runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strava_id       text UNIQUE NOT NULL,
  strava_url      text,
  date            date NOT NULL,

  -- core metrics from Strava
  distance_km     numeric(6,3) NOT NULL,
  duration_seconds int NOT NULL,
  avg_pace_seconds numeric(6,2),    -- computed: duration / distance
  avg_hr          int,
  max_hr          int,
  elevation_gain_m int,
  temperature_c   int,

  -- derived metrics (computed on ingest)
  hr_drift_bpm    int,               -- avg_hr_2nd_half - avg_hr_1st_half
  gap_pace_seconds numeric(6,2),     -- iz Strave GAP
  effort_score    int,               -- 1-100 composite (pace + HR + elevation)

  -- classification (auto, user-overridable)
  workout_type    text NOT NULL,     -- enum: easy | tempo | interval | long | race | recovery | hill
  workout_subtype text,              -- enum: cruise_tempo | vo2max | threshold | progressive_long | hill_repeats | hm_pace_embedded | continuous_tempo | recovery_easy | fartlek
  phase           text,              -- F1 | F2 | F3 | F4 | F5a | F5b-LJ | F5c | F5d-Palmanova
  classification_confidence numeric(3,2),  -- 0.0-1.0 (0.95 = high confidence, <0.7 = ambiguous, prompt user)
  classification_overridden boolean DEFAULT false,

  -- detail
  splits          jsonb,             -- [{km: 1, pace_seconds: 270, hr: 145, elevation: 12}, ...]
  laps            jsonb,             -- za strukturirane treninge: [{lap: 1, distance, duration, pace, hr, type: 'work'|'recovery'}, ...]

  -- planning + analysis
  planned_pace_target_seconds numeric(6,2),  -- nullable, samo če iz suggesterja
  planned_workout_id uuid,           -- FK to workout_suggestions
  notes           text,
  analysis_result jsonb,             -- AI Analiza output

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_runs_date ON runs(date DESC);
CREATE INDEX idx_runs_phase ON runs(phase);
CREATE INDEX idx_runs_type ON runs(workout_type);
```

### Tabela `exercises`

```sql
exercises (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_en         text NOT NULL UNIQUE,
  name_sl         text,              -- Slovenski naziv za UI

  category        text NOT NULL,     -- enum: compound | accessory | core | plyo | tendon | mobility

  -- anatomska metadata (arrays)
  movement_patterns text[] NOT NULL, -- iz taxonomy sekcija 6
  primary_muscles   text[] NOT NULL,
  secondary_muscles text[],
  tendons         text[],

  -- pragmatika
  is_unilateral   boolean DEFAULT false,
  equipment       text[] NOT NULL,   -- ['bodyweight', 'dumbbell', 'barbell', 'band', 'box', 'wall', 'partner']
  is_bodyweight_only boolean DEFAULT false,
  is_time_based   boolean DEFAULT false,  -- true za planke, carries, isometrics
  intrinsic_difficulty int NOT NULL CHECK (intrinsic_difficulty BETWEEN 1 AND 5),
  is_big_three    boolean DEFAULT false,

  -- default parametri (range)
  default_sets_min int DEFAULT 2,
  default_sets_max int DEFAULT 4,
  default_reps_min int,
  default_reps_max int,
  default_duration_seconds_min int,  -- za time_based
  default_duration_seconds_max int,
  default_rir_min int DEFAULT 2,
  default_rir_max int DEFAULT 4,

  -- omejitve
  max_per_week    int DEFAULT 2,     -- frequency cap za suggester

  -- meta
  injury_risk_notes text,
  technique_notes text,
  video_url       text,
  alternatives    uuid[],            -- substitute exercises

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_big3 ON exercises(is_big_three) WHERE is_big_three = true;
```

### Tabela `strength_sessions`

```sql
strength_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date            date NOT NULL,
  difficulty      int NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  duration_min    int,
  phase           text,
  session_type    text,              -- medium | heavy | light | explosive | maintenance

  exercises       jsonb NOT NULL,
  -- struktura: [
  --   {
  --     exercise_id: uuid,
  --     name_sl: "Bolgarski počep",
  --     sets: 3,
  --     reps: 8,                    -- ali duration_seconds za time_based
  --     weight_kg: 12.5,            -- ali null za bodyweight
  --     rir: 3,
  --     actual_sets: 3,             -- po izvedbi
  --     actual_reps: [8,8,7],       -- per-set actual
  --     actual_weight_kg: 12.5,
  --     notes: "L noga čutila adduktorje"
  --   }, ...
  -- ]

  suggested_by_id uuid,              -- FK to workout_suggestions
  notes           text,
  analysis_result jsonb,             -- v2

  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_strength_date ON strength_sessions(date DESC);
CREATE INDEX idx_strength_phase ON strength_sessions(phase);
```

### Tabela `phase_config`

```sql
phase_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_code      text UNIQUE NOT NULL,
  start_date      date NOT NULL,
  end_date        date NOT NULL,

  -- pace targets (seconds per km)
  easy_hr_max     int,
  threshold_pace_seconds numeric(6,2),
  vo2max_pace_seconds numeric(6,2),
  hm_pace_seconds numeric(6,2),
  mp_pace_seconds numeric(6,2),      -- marathon pace, nullable

  -- volume
  weekly_volume_target_km int,
  strength_frequency int,            -- 1-4

  -- meta
  key_race        text,
  emphasis_notes  text,              -- "Tendon adaptation focus", "Speed peak", itd.

  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

### Tabela `workout_suggestions`

```sql
workout_suggestions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_generated  timestamptz DEFAULT now(),
  suggester_type  text NOT NULL,     -- 'running' | 'strength'

  input_params    jsonb NOT NULL,    -- vse user + auto context inputs
  output_workout  jsonb NOT NULL,    -- generated workout struktura
  rationale       text NOT NULL,

  status          text DEFAULT 'pending',  -- pending | accepted | modified | rejected | expired
  actual_session_id uuid,            -- FK to runs.id or strength_sessions.id po izvedbi
  modifications   jsonb,             -- če user spremenil, kaj je spremenil
  feedback_notes  text
);

CREATE INDEX idx_suggestions_date ON workout_suggestions(date_generated DESC);
CREATE INDEX idx_suggestions_status ON workout_suggestions(status);
```

### Tabela `weekly_summary` (opcijska, v2)

Lahko je tudi computed view. Cilj: poganja BIG3 status widget + anatomska coverage heatmap.

---

## 5. Exercise library (seed data, 28 vaj)

**LEGENDA:**
- ⭐ = BIG3 (mandatory weekly coverage)
- "max/wk" = frequency cap za suggester scoring
- "diff" = intrinsic difficulty 1-5

### 5.1 BIG3

| name_en | name_sl | category | movement_patterns | primary_muscles | secondary | tendons | equipment | is_uni | diff | max/wk | reps_range |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Bulgarian split squat | Bolgarski počep ⭐ | compound | [squat_unilateral] | [quads, glute_max] | [hamstrings, glute_med, core_lateral] | [patellar] | [bodyweight, dumbbell, barbell] | true | 3 | 3 | 6-10 |
| Single-leg RDL | Enonožni RDL ⭐ | compound | [hinge_unilateral] | [hamstrings_prox, glute_max] | [erector_spinae, core_rotational] | [hamstring_origin, achilles] | [bodyweight, dumbbell, kettlebell] | true | 4 | 3 | 6-10 |
| Calf raise soleus (bent-knee, single-leg) | Dvigi na soleus (skrčeno koleno, enonožno) ⭐ | compound | [calf_soleus] | [soleus] | [foot_intrinsics] | [achilles] | [bodyweight, dumbbell, barbell] | true | 2 | 3 | 8-15 |

### 5.2 Unilateral lower body (accessory)

| name_en | name_sl | category | movement_patterns | primary_muscles | secondary | tendons | equipment | diff | max/wk | reps_range |
|---|---|---|---|---|---|---|---|---|---|---|
| Step-up | Step-up | accessory | [squat_unilateral] | [quads, glute_max] | [glute_med, hamstrings] | [patellar] | [bodyweight, dumbbell] | 2 | 2 | 8-12 |
| Walking lunges | Hojni izpadi | accessory | [lunge] | [quads, glute_max] | [hamstrings, adductors] | [patellar] | [bodyweight, dumbbell] | 2 | 2 | 10-16 (per leg) |
| Front lunges | Sprednji izpadi | accessory | [lunge] | [quads, glute_max] | [hamstrings] | [patellar] | [bodyweight, dumbbell] | 2 | 2 | 8-12 |
| Back lunges (reverse) | Zadnji izpadi | accessory | [lunge] | [glute_max, hamstrings] | [quads, core_lateral] | [hamstring_origin] | [bodyweight, dumbbell] | 2 | 2 | 8-12 |
| Cossack squat | Cossack počep | accessory | [squat_unilateral, hip_adduction] | [adductors, glute_med, quads] | [glute_max, hip_flexors] | — | [bodyweight, dumbbell, kettlebell] | 3 | 2 | 6-10 |

### 5.3 Bilateral lower body

| name_en | name_sl | category | movement_patterns | primary_muscles | secondary | tendons | equipment | diff | max/wk | reps_range |
|---|---|---|---|---|---|---|---|---|---|---|
| Goblet squat | Goblet počep | compound | [squat_bilateral] | [quads, glute_max] | [adductors, core_anterior] | [patellar] | [dumbbell, kettlebell] | 2 | 2 | 8-12 |
| Glute bridge | Glute most | accessory | [hip_extension] | [glute_max, hamstrings_prox] | [core_anterior] | [gluteal] | [bodyweight, barbell] | 1 | 2 | 10-15 |
| Hip thrust | Hip thrust | compound | [hip_extension] | [glute_max, hamstrings_prox] | [core_anterior, adductors] | [gluteal] | [bodyweight, barbell, dumbbell] | 2 | 2 | 8-12 |
| Single-leg glute bridge | Enonožni glute most | accessory | [hip_extension] | [glute_max, hamstrings_prox, glute_med] | [core_lateral] | [gluteal] | [bodyweight] | 2 | 2 | 8-12 |

### 5.4 Posterior chain eccentric (kritično)

| name_en | name_sl | category | movement_patterns | primary_muscles | secondary | tendons | equipment | diff | max/wk | reps_range |
|---|---|---|---|---|---|---|---|---|---|---|
| Nordic curl | Nordijski upogib | compound | [hinge_unilateral_eccentric] | [hamstrings_distal] | [glute_max, core_anterior] | [hamstring_origin] | [bodyweight, partner, band] | 4 | 2 | 3-8 |

### 5.5 Calves + foot/ankle

| name_en | name_sl | category | movement_patterns | primary_muscles | secondary | tendons | equipment | diff | max/wk | reps_range |
|---|---|---|---|---|---|---|---|---|---|---|
| Calf raise gastroc (straight-knee) | Dvigi na meča (ravno koleno) | accessory | [calf_gastroc] | [gastrocnemius] | [soleus, foot_intrinsics] | [achilles] | [bodyweight, dumbbell, barbell] | 1 | 2 | 10-15 |
| Tibialis raises | Dvigi tibialisa | tendon | [foot_ankle] | [tibialis_anterior] | — | — | [bodyweight, band, wall] | 1 | 3 | 12-20 |

### 5.6 Plyometrics

| name_en | name_sl | category | movement_patterns | primary_muscles | secondary | tendons | equipment | diff | max/wk | reps_range |
|---|---|---|---|---|---|---|---|---|---|---|
| Pogo jumps | Pogo skoki | plyo | [plyo_reactive, calf_gastroc] | [gastrocnemius, soleus, foot_intrinsics] | [quads, core_anterior] | [achilles, plantar_fascia] | [bodyweight] | 2 | 2 | 20-40 (or 20-30s sets) |
| Side-to-side jumps (1 or 2 leg) | Stranski skoki | plyo | [plyo_horizontal, hip_abduction] | [glute_med, adductors, quads] | [core_lateral] | — | [bodyweight] | 2 | 2 | 10-20 per side |
| Side skates | Drsalni skoki | plyo | [plyo_horizontal, hip_abduction] | [glute_med, glute_max, adductors] | [quads, core_lateral] | — | [bodyweight] | 2 | 2 | 10-20 per side |
| Lunge to high knees | Izpad v dvignjeno koleno | plyo | [plyo_horizontal, lunge] | [quads, hip_flexors, glute_max] | [hamstrings, core_anterior] | — | [bodyweight] | 2 | 2 | 8-12 per side |
| Lunge jumps | Skočni izpadi | plyo | [plyo_vertical, lunge] | [quads, glute_max, hamstrings] | [adductors, core_lateral] | [patellar] | [bodyweight] | 3 | 1 | 6-12 per side |
| Box jumps | Skoki na škatlo | plyo | [plyo_vertical] | [quads, glute_max, gastrocnemius] | [hamstrings, core_anterior] | [achilles, patellar] | [box, bodyweight] | 3 | 1 | 5-10 |
| Broad jumps | Dolgi skoki | plyo | [plyo_horizontal] | [glute_max, hamstrings, quads] | [gastrocnemius, core_anterior] | [achilles] | [bodyweight] | 3 | 1 | 5-10 |

### 5.7 Core anti-X

| name_en | name_sl | category | movement_patterns | primary_muscles | secondary | tendons | equipment | is_time_based | diff | max/wk | params_range |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Copenhagen isometric | Copenhagen plank | core | [hip_adduction, anti_lateral_flexion] | [adductors, core_lateral] | [glute_med, obliques] | — | [bodyweight, bench] | true | 3 | 2 | 20-60s per side |
| Dead bug | Dead bug | core | [anti_extension] | [core_anterior, hip_flexors] | [erector_spinae] | — | [bodyweight] | 1 | 3 | 8-12 per side |
| Side plank with hip lift | Stranski plank z dvigi bokov | core | [hip_abduction, anti_lateral_flexion] | [glute_med, core_lateral] | [obliques, glute_max] | — | [bodyweight] | 2 | 3 | 8-15 per side |
| Pallof press | Pallof press | core | [anti_rotation] | [core_rotational] | [core_anterior, glute_med] | — | [band, cable] | 2 | 3 | 8-12 per side |
| Bird dog | Bird dog | core | [anti_rotation, anti_extension] | [core_anterior, core_rotational, erector_spinae] | [glute_max, mid_back] | — | [bodyweight] | 1 | 3 | 8-12 per side |
| Suitcase carry | Suitcase carry | core | [anti_lateral_flexion] | [core_lateral, grip] | [glute_med, obliques] | — | [dumbbell, kettlebell] | 2 | 2 | 20-40m per side |

### 5.8 Hip stability

| name_en | name_sl | category | movement_patterns | primary_muscles | secondary | tendons | equipment | diff | max/wk | reps_range |
|---|---|---|---|---|---|---|---|---|---|---|
| Banded clamshell | Clamshell s trakom | mobility | [hip_abduction] | [glute_med, glute_min] | [glute_max] | — | [band, bodyweight] | 1 | 3 | 12-20 per side |

---

## 6. Taxonomy reference (enums)

### 6.1 movement_patterns

```
squat_bilateral
squat_unilateral
hinge_bilateral
hinge_unilateral
hinge_unilateral_eccentric
lunge
calf_gastroc
calf_soleus
foot_ankle
hip_extension
hip_abduction
hip_adduction
plyo_horizontal
plyo_vertical
plyo_reactive
anti_rotation
anti_extension
anti_lateral_flexion
posterior_chain_pull
```

### 6.2 primary_muscles + secondary_muscles (canonical list)

```
quads
hamstrings_prox        -- proximal (origin near sit bones)
hamstrings_distal      -- distal (insertion near knee)
glute_max
glute_med
glute_min
adductors
hip_flexors
gastrocnemius
soleus
tibialis_anterior
tibialis_posterior
peroneals
foot_intrinsics
erector_spinae
multifidus
core_anterior          -- rectus, deep abs
core_lateral           -- obliques + QL
core_rotational        -- transverse abs + obliques rotational
lats
mid_back
rear_delts
grip                   -- forearm/grip strength
obliques               -- subset of core_lateral; also OK as separate
```

### 6.3 tendons (kritične za tekača)

```
achilles
patellar
plantar_fascia
hamstring_origin       -- ischial tuberosity attachment
gluteal
peroneal
posterior_tibial
```

### 6.4 equipment

```
bodyweight
dumbbell
barbell
kettlebell
band
cable
box
wall
bench
partner
```

### 6.5 categories

```
compound       -- multi-joint, large muscle groups
accessory      -- supplementary multi-joint
core           -- core-specific anti-X
plyo           -- plyometric/ballistic
tendon         -- tendon-targeting (tibialis raises, isometrics)
mobility       -- low-load activation/mobility
```

### 6.6 workout_type + workout_subtype

```
workout_type:
  easy
  tempo
  interval
  long
  race
  recovery
  hill

workout_subtype (paired with workout_type):
  easy + recovery_easy
  easy + general_aerobic
  tempo + continuous_tempo
  tempo + cruise_intervals
  tempo + progression
  tempo + hm_pace
  interval + vo2max
  interval + threshold_reps
  interval + speed
  interval + hill_repeats
  interval + fartlek
  long + easy_long
  long + progressive_long
  long + hm_pace_embedded
  long + marathon_pace_embedded
  hill + hill_repeats_short      -- 60-90s steep
  hill + hill_repeats_long       -- 200-400m moderate
  hill + hill_sprints            -- 10-15s, full recovery
  race + (5k|10k|hm|marathon|other)
  recovery + recovery_easy
```

---

## 7. Strava ingest + auto workout classifier

### 7.1 Ingest flow

1. User pasta Strava URL (oblika `https://www.strava.com/activities/{id}`)
2. Backend fetcha aktivnost preko Strava API (assumi: OAuth token že obstaja v `secrets` ali user account)
3. Extracta: distance, duration, avg_hr, max_hr, elevation_gain, temperature, splits per km, laps (če obstajajo)
4. Computa: avg_pace, hr_drift (split run na 2 polovici, primerjaj avg HR), gap_pace (iz Strave če dostopno), effort_score
5. Klasificira workout_type + subtype (sekcija 7.2)
6. Auto-assigna `phase` glede na `date` + `phase_config`
7. Shrani v `runs`
8. Če `classification_confidence < 0.7`, UI prikaže prompt: "Sistem je klasificiral kot {type}/{subtype} z {confidence}%. Potrdi ali popravi."

### 7.2 Auto-classification rules (rule-based)

**Input:** distance_km, duration, avg_pace, avg_hr (relative to user max), elevation_gain_m, splits, laps

**Rules (evaluate top-down, first match wins):**

```
IF lap structure exists AND laps count >= 4 AND lap_pace_variance > 30% of mean:
    workout_type = "interval"
    IF lap_work_duration <= 90s AND lap_pace ~ 5K pace target:
        subtype = "vo2max"
    ELIF lap_work_duration > 90s AND lap_pace ~ threshold pace:
        subtype = "threshold_reps"
    ELIF avg_lap_elevation > 15m:
        subtype = "hill_repeats"
    ELSE:
        subtype = "fartlek"
    confidence = 0.9

ELIF distance_km >= 18:
    workout_type = "long"
    IF final 3-5 km pace > 10% faster than first 3-5 km pace:
        subtype = "progressive_long"
    ELIF middle blocks at HM pace target (4-15 km @ hm_pace ± 5s):
        subtype = "hm_pace_embedded"
    ELSE:
        subtype = "easy_long"
    confidence = 0.85

ELIF distance_km >= 8 AND distance_km < 18 AND avg_pace within 5s of threshold_pace_target:
    workout_type = "tempo"
    IF lap structure with work/rest pattern:
        subtype = "cruise_intervals"
    ELIF pace progression detectable in splits:
        subtype = "progression"
    ELSE:
        subtype = "continuous_tempo"
    confidence = 0.85

ELIF elevation_gain_m / distance_km > 25 AND repeated up/down splits in splits:
    workout_type = "hill"
    IF lap_duration <= 90s:
        subtype = "hill_repeats_short"
    ELIF lap_duration > 90s AND lap_duration <= 240s:
        subtype = "hill_repeats_long"
    ELSE:
        subtype = "hill_sprints"
    confidence = 0.8

ELIF avg_pace > easy_pace_target AND avg_hr < (max_hr * 0.75):
    workout_type = "easy"
    IF duration_minutes <= 45:
        subtype = "recovery_easy"
    ELSE:
        subtype = "general_aerobic"
    confidence = 0.9

ELSE:
    workout_type = "easy"
    subtype = "general_aerobic"
    confidence = 0.5   # low, prompt user
```

**Race detection:** Če aktivnost je race (od user input), preskoči auto klasifikacijo. Dodaj checkbox v ingest UI: "To je race".

### 7.3 HR drift computation

```
1. Razdeli splits array na 2 polovici (po času, ne distance)
2. avg_hr_first = average of HR values in first half
3. avg_hr_second = average of HR values in second half
4. hr_drift_bpm = avg_hr_second - avg_hr_first
```

Cilj: <10 bpm drift na 15+km easy tek = solidna aerobic baza.

---

## 8. Strength suggester

### 8.1 Input

```typescript
type StrengthSuggesterInput = {
  difficulty: 1 | 2 | 3 | 4 | 5;
  available_time_min?: number;  // optional, default izračunaj iz difficulty
  exclude_equipment?: string[];  // če nimaš dostopa do nečesa danes
};
```

### 8.2 Auto context

```typescript
type StrengthContext = {
  phase: string;                          // iz today + phase_config
  last_7d_strength: StrengthSession[];    // za variety + coverage
  last_7d_runs: Run[];                    // za freshnes guard
  next_planned_hard_run: Run | null;      // če < 48h, izloči high-impact plyo
  big_three_status_this_week: {
    bss: boolean,
    sl_rdl: boolean,
    calf_soleus: boolean
  };
};
```

### 8.3 Session parameters po difficulty

| diff | n_exercises | sets_range | reps_range | rir_target | duration_target_min | session_type |
|---|---|---|---|---|---|---|
| 1 | 2-3 | 2-3 | 6-8 | 4 | 15-20 | light |
| 2 | 3-4 | 3 | 6-8 | 3-4 | 20-25 | maintenance |
| 3 | 5 | 3 | 6-8 | 3 | 30-35 | medium (default F2/F3/F5) |
| 4 | 5-6 | 3-4 | 5-6 | 2-3 | 35-40 | heavy/power |
| 5 | 6-7 | 4 | 4-5 | 2 | 40-45 | peak (max 1×/teden) |

### 8.4 Algoritem (pseudocode)

```python
def suggest_strength_session(input, context):
    # 1. Session params
    params = SESSION_PARAMS[input.difficulty]
    
    selected = []
    
    # 2. Mandatory BIG3 (manjkajoči ta teden)
    missing_big3 = [
        ex for ex in BIG3_EXERCISES 
        if not context.big_three_status_this_week[ex.short_key]
    ]
    # Vključi do 2 BIG3 v eno sesijo (ne preobremenjuj enega dne)
    selected.extend(missing_big3[:2])
    
    # 3. Filtriraj kandidate
    candidates = exercises.filter(
        intrinsic_difficulty <= input.difficulty + 1,
        not_in_last_session(context.last_7d_strength[-1] if exists),
        weekly_use_count(context.last_7d_strength) < ex.max_per_week,
        not (ex.category == 'plyo' and ex.intrinsic_difficulty >= 3 
             and context.next_planned_hard_run is within 48h),
        not (input.exclude_equipment and ex.equipment subset of input.exclude_equipment)
    )
    
    # 4. Score kandidate
    weekly_coverage = compute_weekly_coverage(context.last_7d_strength)
    covered_patterns = compute_covered_patterns(context.last_7d_strength)
    
    for c in candidates:
        score = 0
        
        # Coverage gap reward
        for muscle in c.primary_muscles:
            target = MUSCLE_WEEKLY_TARGET[muscle][context.phase]
            current = weekly_coverage.get(muscle, 0)
            if current < target:
                score += 2 * (target - current) / target
        
        for tendon in c.tendons:
            target = TENDON_WEEKLY_TARGET[tendon][context.phase]
            current = weekly_coverage.get(tendon, 0)
            if current < target:
                score += 1.5
        
        for pattern in c.movement_patterns:
            if pattern not in covered_patterns:
                score += 1
        
        # Phase emphasis bonuses
        score += PHASE_BONUS[context.phase].get(c.category, 0)
        score += PHASE_BONUS[context.phase].get(c.movement_patterns, 0)
        
        # Recency penalty (newer use = lower score)
        days_since_last = days_since_last_use(c, context.last_7d_strength)
        if days_since_last is not None:
            score *= min(1.0, days_since_last / 4)
        
        c.score = score
    
    # 5. Fill remaining slots
    remaining_slots = params.n_exercises - len(selected)
    candidates.sort(key=lambda x: x.score, reverse=True)
    selected.extend(candidates[:remaining_slots])
    
    # 6. Enforced balance
    # - Vsaka sesija mora imeti vsaj eno core/anti-X vajo
    if not any(e.category == 'core' for e in selected):
        # Swap lowest-scoring non-core for top-scoring core
        non_core = [e for e in selected if e.category != 'core' and not e.is_big_three]
        core_candidates = [c for c in candidates if c.category == 'core']
        if non_core and core_candidates:
            selected.remove(min(non_core, key=lambda x: x.score))
            selected.append(core_candidates[0])
    
    # - Foot/ankle vsaj 1× tedensko v F2-F3
    if context.phase in ('F2', 'F3') and 'foot_ankle' not in covered_patterns:
        if not any('foot_ankle' in e.movement_patterns for e in selected):
            foot_candidates = [c for c in candidates if 'foot_ankle' in c.movement_patterns]
            if foot_candidates:
                # Swap lowest scoring non-BIG3 non-core
                swappable = [e for e in selected if not e.is_big_three and e.category != 'core']
                if swappable:
                    selected.remove(min(swappable, key=lambda x: x.score))
                    selected.append(foot_candidates[0])
    
    # 7. Apply sets/reps/RIR
    for ex in selected:
        ex.sets = clamp(params.sets, ex.default_sets_min, ex.default_sets_max)
        if ex.is_time_based:
            ex.duration_seconds = derive_duration(input.difficulty, ex)
        else:
            ex.reps = clamp(params.reps, ex.default_reps_min, ex.default_reps_max)
        ex.rir = params.rir_target
        ex.weight_suggestion = suggest_weight(ex, context.last_7d_strength)
    
    # 8. Rationale (rule-based)
    rationale = compose_rationale(selected, missing_big3, weekly_coverage, 
                                   context.next_planned_hard_run, context.phase)
    
    # 9. Output
    return {
        exercises: selected,
        rationale: rationale,
        big3_status_after: updated_big3_status(context, selected),
        coverage_after: updated_coverage(weekly_coverage, selected),
        estimated_duration_min: estimate_duration(selected, params)
    }
```

### 8.5 Phase bonus map

```python
PHASE_BONUS = {
    'F2': {
        'tendon': 2,           # base tendon adaptation
        'foot_ankle': 2,
        'hinge_unilateral': 1,
        ('plyo', 'high_impact'): -2,  # penalize Nordic, depth jumps before base
    },
    'F3': {
        'squat_unilateral': 1,
        'calf_soleus': 1,
        'plyo_horizontal': 1,
        'plyo_reactive': 1,
    },
    'F4': {
        'plyo_vertical': 2,
        'plyo_reactive': 2,
        'hinge_unilateral': 1,
        # F4 = 2× weekly, ne over-fatigue
    },
    'F5a': {
        'plyo_reactive': 1,    # achilles stiffness za HM finish
        'squat_unilateral': 1,
        'hip_extension': 1,    # glute endurance
    },
    'F5b-LJ': {
        'core': 1,
        ('plyo', 'high_impact'): -3,  # taper week, no CNS load
    },
    'F5c': {
        'plyo_reactive': 1,
        'hip_extension': 1,
    },
    'F5d-Palmanova': {
        'core': 1,
        ('plyo', 'high_impact'): -3,
        # default low intensity, light maintenance only
    }
}
```

### 8.6 Weight suggestion logic

Za vsako vajo, ki ni bodyweight-only ali time-based:
1. Najdi zadnjo izvedbo te vaje v `strength_sessions`
2. Če RIR ≥ 3 dvakrat zapored pri istih reps in sets → predlagaj +2.5kg (small DB) ali +5kg (BB)
3. Če RIR ≤ 2 ali nepopolne ponovitve → ohrani isto težo
4. Če nikoli izvedena → predlagaj "začni z lažjo, oceni RIR po 1. setu"

### 8.7 Rationale composer (rule-based primer)

```
"Zadnji strength {days_since_last_strength} dni nazaj. 
{if missing_big3}Manjkajoči BIG3 ta teden: {missing_big3_names}. 
{endif}
{if phase == 'F4'}F4 peak speed — 2× tedensko strength, fokus power. 
{elif phase in ('F2', 'F3', 'F5a', 'F5c')}{phase} medium — 3× tedensko, balance + progresija. 
{endif}
{if next_hard_run_within_48h}Hard tek čez {hours} ur → izpustil sem high-impact plyo. 
{endif}
{if coverage_gap}Pokritost ta teden še šibka na: {gap_areas}. 
{endif}
Difficulty {input.difficulty} = {duration} min, RIR {rir}."
```

---

## 9. Running suggester

### 9.1 Input

```typescript
type RunningSuggesterInput = {
  goal: '5k_pb' | '10k_pb' | 'hm_pb' | 'marathon_base' | 'general';
  category?: 'easy' | 'tempo' | 'interval' | 'long' | 'hill';  // optional, auto-decide if absent
  available_time_min?: number;
  terrain_preference?: 'flat' | 'hill' | 'mixed';
};
```

### 9.2 Auto context

```typescript
type RunningContext = {
  phase: string;
  last_7d_runs: Run[];
  next_planned_race: Run | null;     // za taper logiko
  recovery_state: 'fresh' | 'normal' | 'fatigued';  // computed iz volume + drift trends
  long_run_done_this_week: boolean;
  hard_sessions_count_this_week: number;
  days_since_last_hard: number;
};
```

### 9.3 Category auto-decision logic

Če `input.category` ni podan:

```
IF context.hard_sessions_count_this_week >= 2 
   AND context.days_since_last_hard < 2:
    → "easy" (recovery)

ELIF NOT context.long_run_done_this_week 
     AND day_of_week IN ['saturday', 'sunday']:
    → "long"

ELIF context.days_since_last_hard >= 3 
     AND context.hard_sessions_count_this_week < 2:
    # Alternate based on what was last hard
    last_hard_type = find_last_hard_type(context.last_7d_runs)
    IF last_hard_type == 'interval' or last_hard_type IN ('vo2max', 'speed', 'hill_repeats'):
        → "tempo"
    ELIF last_hard_type == 'tempo':
        → "interval"
    ELSE:
        → "interval"  # default mid-week hard

ELSE:
    → "easy"
```

### 9.4 Workout templates per phase × goal × category

Za vsako kombinacijo phase + goal + category, sistem ima template. Sets so primeri — algoritem variira proge in pace targete glede na context.

#### Interval templates

| phase | goal | template | terrain |
|---|---|---|---|
| F2 | hm_pb | 5×3min @ vo2max_pace, 2min jog rec | flat or rolling |
| F2 | hm_pb (alt hill) | 8-10 × 90s up @ hard effort, jog down | hill |
| F3 | hm_pb | 5×1000 @ vo2max_pace, 90s jog (progressing weekly to 4×1500, 3×2000, 2×3000) | flat |
| F3 | 5k_pb | 8×600 @ 3K pace, 90s jog | flat |
| F4 | 5k_pb | 10×400 @ 3K pace, 60s jog | flat |
| F4 | 10k_pb | 6×1000 @ 10K pace, 75s jog | flat |
| F4 | hm_pb | 4×1500 @ 10K pace, 2min jog | flat |
| F5a | hm_pb | 3-4 × 2000 @ threshold (4:15), 90s jog | flat |
| F5a | hm_pb (alt) | 5-6 × 1000 @ HM pace, 60s jog | flat |
| F5b-LJ / F5d-Palmanova (taper) | hm_pb | 5×400 @ goal_pace, full recovery | flat |

#### Tempo templates

| phase | goal | template |
|---|---|---|
| F2 | hm_pb | 25-30 min continuous @ threshold (4:15-4:20) |
| F3 | hm_pb | 4×8min cruise @ threshold, 2min jog rec |
| F4 | 5k/10k_pb | 15-20 min @ threshold or 3×2km @ 10K pace, 90s rec |
| F5a | hm_pb | 8-10 km @ HM pace (4:15), continuous |
| F5a (alt) | hm_pb | 2×4 km @ HM pace, 3min easy between |
| F5b-LJ taper | hm_pb | 3-4 km @ HM pace, 1× only mid-week |

#### Long run templates

| phase | goal | template |
|---|---|---|
| F1 | recovery | 18-22 km easy, HR ≤145 |
| F2 | hm_pb / marathon_base | 22-25 km easy, final 4-6 km moderate progressive |
| F3 | hm_pb | 22-25 km easy weekly, every 3rd week 28 km z final 6-8 km @ MP-HM pace |
| F4 | 5k/10k_pb | 22-25 km easy (volume maintenance, ne progression) |
| F5a | hm_pb | 25-28 km z embedded HM pace: warmup 8 km easy, 12-15 km @ 4:15, cooldown 3-5 km |
| F5a (alt) | hm_pb | 22-25 km z 2×4 km HM pace embedded, easy between |
| F5a (peak) | hm_pb | 30 km z 4-6 km HM pace zadnji teret |
| F5b-LJ race week | hm_pb | 16-18 km easy 6-7 days out, 10-12 km easy 2-3 days out |
| F5d-Palmanova race week | hm_pb | 12-15 km easy 6 days out, 8-10 km easy 2 days out |

#### Hill workouts

| phase | template |
|---|---|
| F2 | 6-8 × 90s up @ hard effort + jog down (base power) |
| F3 | 8-10 × 60-90s steep hills @ vo2max effort |
| F4 | 10-15 × 10-15s hill sprints, full recovery (max power) |
| F5a | 6-8 × 200-400m moderate gradient, 5K effort |
| F5b/F5d | none (taper) |

### 9.5 Output struktura

```typescript
type RunningSuggestion = {
  type: WorkoutType;
  subtype: WorkoutSubtype;
  structure: WorkoutSegment[];
  estimated_total_km: number;
  estimated_duration_min: number;
  target_paces: {
    easy: string,       // "5:00-5:30/km"
    main: string,       // "4:15/km"
    recovery?: string
  };
  terrain_recommendation: 'flat' | 'hill' | 'mixed';
  rationale: string;
  alternatives?: RunningSuggestion[];  // 1-2 variant
};

type WorkoutSegment = {
  phase: 'warmup' | 'main' | 'recovery' | 'cooldown';
  type: 'continuous' | 'reps';
  // for continuous
  duration_min?: number;
  distance_km?: number;
  pace_target?: string;
  hr_target?: string;
  // for reps
  reps?: number;
  work?: { duration_seconds?: number, distance_m?: number, pace_target: string };
  rest?: { duration_seconds?: number, pace_target?: string };
};
```

### 9.6 Guards

- Min 48h med dvema hard sesijama (tempo, interval, hill, race)
- Long run NE day after interval/tempo (vsaj 1 easy/rest dan med)
- V taper teden (zadnja 2 tedna pred race) NE high-volume long run
- Race week: max 1 lahek pace-feel session 2-3 dni pred race
- Hill workout NE day after heavy strength session (DOMS interference)

---

## 10. UI/UX expectations

### 10.1 Glavni views

1. **Dashboard / Home**
   - Trenutna faza (badge) + days_until_next_race
   - Ta teden: pretečeni km / target, hard sesij count, long run status
   - BIG3 status widget (3 ikone, ✓ ali ✗)
   - Anatomska coverage heatmap (kompaktna verzija)
   - Gumb "Predlagaj naslednji trening" → modal z output suggesterja

2. **Strava Ingest**
   - Input field za URL
   - Po fetchanju: preview kartica z auto-classification result + confidence badge
   - "Potrdi" ali "Popravi" gumbi
   - Po shranjevanju: redirect na detail view aktivnosti

3. **Activity detail (`runs` row)**
   - Vsi metriki + splits chart + HR drift indicator
   - "Analiza" gumb (obstoječi AI feature)
   - Edit fields: workout_type, subtype, phase, notes

4. **Strength session UI**
   - **Predlog flow**: difficulty slider (1-5) → "Generiraj" → output kartica z vajami + rationale
   - **Log flow**: ko izvedeš, vnos actual reps/weight/RIR per exercise
   - Save → shrani v `strength_sessions`

5. **Exercise library admin**
   - List vseh vaj (filterable by category, muscle, equipment)
   - CRUD (Tim sam dodaja nove vaje skozi UI, ne SQL)
   - Per-exercise edit: vse fieldi iz `exercises` tabele

6. **Phase config admin**
   - List phases
   - CRUD: lahko spreminjaš datume, pace targete, volume, frequency

7. **Weekly view**
   - Calendar grid: vsak dan kaže workout (planiran ali izveden)
   - Tedenski volume + hard count + long status
   - BIG3 status + coverage heatmap

### 10.2 Coverage heatmap

Vizualna mreža mišic/tetiv s color-coded fill po pokritosti zadnjih 7 dni:
- 🟢 hit ≥ 2× (good)
- 🟡 hit 1× (OK)
- 🔴 not hit (gap)

Klik na muscle → seznam vaj, ki ga targetajo.

### 10.3 Manual overrides

- Vsako auto-klasificiranega run-a mora biti mogoče popraviti
- Vsak predlog suggesterja: mora biti mogoče modificirati pred shranjevanjem (zamenjati vajo, spremeniti sets/reps, dodati svojo vajo)
- Phase config: vse polje editable
- Exercise library: vse polje editable

---

## 11. AI Analiza integration (existing feature)

Obstoječi "Analiza" gumb po treningu naj ostane. V `runs.analysis_result` jsonb shrani output. **V tej fazi NE razširjaj na strength** — to je v2 scope (po Phase 4).

---

## 12. Build order

**Phase 1: Foundation (target: 1-2 tedna)**
- [ ] Migracije za `runs`, `exercises`, `strength_sessions`, `phase_config`, `workout_suggestions`
- [ ] Seed: vse vaje iz sekcije 5 v `exercises`
- [ ] Seed: vse faze iz sekcije 3 v `phase_config`
- [ ] Strava API integration: paste URL → fetch → parse → save
- [ ] Auto workout classifier (rule-based, sekcija 7.2)
- [ ] Manual override UI za workout_type/subtype/phase
- [ ] Strength session manual logging form (brez suggesterja, samo log)
- [ ] Exercise library CRUD UI
- [ ] Phase config CRUD UI

**Phase 2: Context tracking (target: 1 teden)**
- [ ] HR drift computation pri ingest
- [ ] effort_score computation
- [ ] Weekly view: volume, hard count, long status
- [ ] BIG3 status widget
- [ ] Coverage heatmap (basic verzija)
- [ ] Phase auto-resolution iz date + phase_config

**Phase 3: Suggesters (target: 3-4 tedna)**
- [ ] Strength suggester z algoritmom iz sekcije 8
- [ ] Running suggester z logiko iz sekcije 9
- [ ] Rationale composer (rule-based, deterministic)
- [ ] Acceptance/modification tracking v `workout_suggestions`
- [ ] UI: "Predlagaj trening" entrypointi (strength + running)

**Phase 4: Polish + v2 (ko prejšnje fazi stable)**
- [ ] AI Analiza za strength sessions
- [ ] Adaptive weight progression iz session history
- [ ] Long-term trends dashboard
- [ ] Race day pacing assistant (race-specific UI)

---

## 13. Open items / Stvari za Claude Code potrditi pred začetkom

1. **Obstoječa Strava integracija**: Tim memory omenja "Garmin data integration" v obstoječi aplikaciji. Preveri trenutni stack — ali že obstaja Strava OAuth/API klient, ali bo treba zgraditi nov? Če nov: prediskutiraj z Timom, ali bo trajen OAuth token v env vars dovolj (single-user), ali polno OAuth flow.

2. **AI Analiza prompt**: obstaja že prompt za "Analiza" gumb pri tekih. Po dodanju strength sessions v v2, bo treba dodati ločen prompt za strength analizo. Za zdaj scope = samo runs.

3. **Past data import**: ali Tim želi backfill zgodovinskih Strava aktivnosti, ali pa app začne tracking od dneva ingest-a naprej? Predlog: dodaj "bulk import" feature v Phase 4, za zdaj manual paste-by-paste.

4. **Strength weight tracking precision**: minimum increment 0.5 kg ali 2.5 kg? (Vpliva na weight_suggestion rounding.)

5. **Notification / reminder system**: ali app pošilja push/email kdaj predlagati trening, ali je vse pull-based (Tim sam odpre app)? Predlog: pull-only v Phase 1-3, push v v2.

6. **Mobile-first vs desktop**: Tim koristi predvsem mobile ali desktop? Layout responsiveness optimizacije.

---

## 14. Appendix: glossary

- **BIG3**: Bolgarski počep + Single-leg RDL + Calf raise (soleus, bent-knee, single-leg). Mandatory weekly coverage exercises, 2-3× tedensko vsaka.
- **RIR**: Reps In Reserve. RIR 3 = lahko bi naredil še 3 ponovitve, ko končaš set.
- **HR drift**: porast srčnega utripa pri konstantni pace skozi trajanje teka. Nizek drift = solidna aerobic baza.
- **GAP**: Grade-Adjusted Pace. Pace, normaliziran za elevacijo.
- **Polarized training**: ~80% lahki teki na nizkem HR (Z1-Z2), ~20% hard (Z4-Z5), čim manj Z3 ("no man's land").
- **Tendon-specific exercise**: ciljno obremeni tetivo za adaptacijo (debelitev, togost). Primer: isometric calf hold, slow tempo RDL.
- **Anti-X core**: anti-rotation (Pallof), anti-extension (dead bug), anti-lateral-flexion (side plank, suitcase carry). Vse 3 ravnine = "tekaški močan" core.
- **F1-F5**: faze v sezoni (recovery → base → specificity → peak speed → HM build). Vsaka ima different volume, pace targete, strength frequency.

---

**End of handoff document.**

Pri morebitnih nejasnostih: Tim je primary kontakt, planning kontekst je v Claude (web) chat zgodovini. Pred začetkom Phase 1 implementacije priporočamo Claude Code-u kratek check-in s Timom za potrditev open items v sekciji 13.
