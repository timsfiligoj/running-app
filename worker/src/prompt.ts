// Prompt for the AI run analysis, ported verbatim from the Supabase
// analyze-run function. The Garmin sections are gone: the Garmin integration
// has been down since Aug 2026 and was not ported to the Worker.

export interface AthleteProfile {
  race_name?: string;
  race_date?: string;
  target_time?: string;
  target_pace?: string;
  experience?: string;
  max_hr?: number;
  weekly_volume?: string;
  training_philosophy?: string;
  race_elevation?: string;
  weaknesses?: string;
  strengths?: string;
  context?: string;
}

export function buildAnalysisPrompt(
  stravaData: Record<string, unknown> | null,
  workoutContext: Record<string, unknown>,
  athleteProfile: AthleteProfile | null,
): string {
  let prompt = `Si strokovnjak za tekaško analizo. Analiziraj naslednji tek in podaj konkretno, personalizirano analizo v slovenščini.
`;

  // Athlete profile - the key context for personalized analysis
  if (athleteProfile) {
    prompt += `\n## Atletski profil`;
    if (athleteProfile.race_name) prompt += `\n- Ciljna tekma: ${athleteProfile.race_name}`;
    if (athleteProfile.race_date) prompt += `\n- Datum tekme: ${athleteProfile.race_date}`;
    if (athleteProfile.target_time) prompt += `\n- Ciljni čas: ${athleteProfile.target_time}`;
    if (athleteProfile.target_pace) prompt += `\n- Ciljni tempo: ${athleteProfile.target_pace}`;
    if (athleteProfile.race_elevation) prompt += `\n- Elevacija tekme: ${athleteProfile.race_elevation}`;
    if (athleteProfile.experience) prompt += `\n- Izkušnje: ${athleteProfile.experience}`;
    if (athleteProfile.max_hr) prompt += `\n- Max HR: ${athleteProfile.max_hr} bpm`;
    if (athleteProfile.weekly_volume) prompt += `\n- Tedenski volumen: ${athleteProfile.weekly_volume}`;
    if (athleteProfile.strengths) prompt += `\n- Prednosti: ${athleteProfile.strengths}`;
    if (athleteProfile.weaknesses) prompt += `\n- Šibkosti: ${athleteProfile.weaknesses}`;
    if (athleteProfile.training_philosophy) prompt += `\n- Trenažna filozofija: ${athleteProfile.training_philosophy}`;
    if (athleteProfile.context) prompt += `\n- Dodaten kontekst: ${athleteProfile.context}`;
    prompt += `\n`;
  }

  prompt += `
## Kontekst treninga
- Načrtovani trening: ${workoutContext.plannedWorkout || 'Ni podatka'}
- Tip teka: ${workoutContext.runType || 'Ni podatka'}
- Komentar tekača: ${workoutContext.comment || 'Ni komentarja'}
- Teden v načrtu: ${workoutContext.weekNumber || 'Ni podatka'}
- Faza treninga: ${workoutContext.phase || 'Ni podatka'}
- Fokus tedna: ${workoutContext.focus || 'Ni podatka'}
`;

  if (stravaData) {
    const paceMinKm = stravaData.avg_speed_kmh
      ? Math.round(60 / (stravaData.avg_speed_kmh as number) * 100) / 100
      : null;

    prompt += `
## Strava podatki
- Naziv: ${stravaData.name}
- Razdalja: ${stravaData.distance_km} km
- Čas gibanja: ${formatSeconds(stravaData.moving_time_seconds as number)}
- Skupni čas: ${formatSeconds(stravaData.elapsed_time_seconds as number)}
- Povprečni tempo: ${paceMinKm ? formatPace(paceMinKm) : 'N/A'} /km
- Povprečni HR: ${stravaData.avg_heart_rate ?? 'N/A'} bpm
- Max HR: ${stravaData.max_heart_rate ?? 'N/A'} bpm
- Vzpon: ${stravaData.elevation_gain} m
- Kadenca: ${stravaData.avg_cadence ?? 'N/A'} korakov/min
- Kalorije: ${stravaData.calories ?? 'N/A'}
- Suffer Score: ${stravaData.suffer_score ?? 'N/A'}
`;

    if (stravaData.laps && Array.isArray(stravaData.laps)) {
      prompt += `\n### Krogi/Odseki (Strava)\n`;
      (stravaData.laps as Array<Record<string, unknown>>).forEach((lap, i) => {
        prompt += `${i + 1}. ${lap.distance_km} km | ${formatPace(lap.pace_min_km as number)} /km | HR: ${lap.avg_heart_rate ?? '-'} bpm | Vzpon: ${lap.elevation_gain}m\n`;
      });
    }
  }

  // Determine run type for adaptive analysis depth
  const runType = (workoutContext.runType as string || '').toLowerCase();
  const isEasyRun = ['easy', 'long'].includes(runType);
  const isIntenseRun = ['tempo', 'intervals', 'hills', 'test', 'race'].includes(runType);

  prompt += `
## Navodila za analizo

STROGA PRAVILA:
- Piši KRATKO. Celotna analiza 150-250 besed.
- NE komentiraj "odklonov od plana". Tekač sam upravlja plan. Zaupaj njegovi odločitvi.
- Priporočila morajo biti usklajena z atletovo trenažno filozofijo. Če je polariziran trening, NE priporočaj več Z3/tempo tekov za easy dneve.
- Upoštevaj fazo treninga: v taperu priporočaj konzervativnost, ne dodajanja volumna. V gradnji baze ne zahtevaj race-pace tekov.
- Piši v slovenščini, strokovno a prijazno.

HR DRIFT ANALIZA (ključni indikator forme):
- Če so na voljo HR spliti po kilometrih, IZRAČUNAJ HR drift: (HR zadnji 2km - HR prvi 2km).
- Drift <5 bpm = odlična aerobna baza. 5-10 bpm = normalen. >10 bpm = potrebno delo na aerobni vzdržljivosti.
- Drift pri race pace je najpomembnejši indikator pripravljenosti za tekmo.

STRUKTURA ODGOVORA (markdown ### za naslove):

### Povzetek
2-3 stavki. Kaj pove ta tek o trenutni formi?

${isIntenseRun ? `### Tempo & HR
Analiza tempa po odsekih in HR odziva. HR drift izračun. Primerjaj s ciljnim tempom.` : `### Ključni podatki
Kratek pregled: tempo, HR (ali je bil v aerobni coni?), kadenca. HR drift če so podatki.`}
${isIntenseRun ? `
### Tehnika
Kadenca, ground contact time, vertical oscillation - samo če podatki obstajajo. 1-2 stavka.` : ''}

### Predikcija cilja
Oceni verjetnost dosega cilja. Uporabi formulo:
- Za tempo/test teke: aktualni pace × 0.97 faktor = predviden HM pace
- HR drift korekcija: drift <10bpm = +5%, drift >15bpm = -10%
- Elevacija korekcija: primerjaj elevacijo tega teka z elevacijo ciljne tekme
Odgovori v formatu:
CONFIDENCE: [število 0-100]%
1-2 stavka zakaj.

### Priporočilo
ENO konkretno priporočilo, usklajeno s trenažno filozofijo in fazo.
`;

  return prompt;
}

function formatSeconds(seconds: number): string {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatPace(minPerKm: number): string {
  if (!minPerKm || !isFinite(minPerKm)) return '-';
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

