import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://vscticoufxoyxyhuzkeu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzY3RpY291ZnhveXh5aHV6a2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUzNDEsImV4cCI6MjA4NDkzMTM0MX0.1o0loHeC86OJ6LQ9UGeTfcedWkZIauxNsJfCMeddwiA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Fetch all workout progress data
const { data, error } = await supabase
  .from('workout_progress')
  .select('*');

if (error) {
  console.error('Error fetching data:', error);
  process.exit(1);
}

// Load training plan
const trainingPlanData = JSON.parse(
  fs.readFileSync('./training-plan-data.json', 'utf-8')
);

// Helper function to format pace
function formatPace(distanceKm, durationSeconds) {
  if (!distanceKm || !durationSeconds) return '-';
  const paceSeconds = durationSeconds / distanceKm;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

// Helper function to format date
function formatDate(weekStartDate, dayIndex) {
  const start = new Date(weekStartDate);
  const date = new Date(start);
  date.setDate(start.getDate() + dayIndex);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${day}.${month}.`;
}

// Process Week 3 data
const week3Data = {
  dates: "10. feb - 16. feb 2026",
  focus: "Močnejši intervali in tempo tek",
  days: []
};

let totalRunKm = 0;
let totalElevation = 0;
let workoutsCompleted = 0;

// Week 3 is week number 3, days 0-6
for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
  const key = `3-${dayIndex}`;
  const progressData = data?.find(row => row.id === key);
  const plannedDay = trainingPlanData.weeks[2].days[dayIndex]; // Week 3 is index 2

  const dayData = {
    day: formatDate('2026-02-10', dayIndex) + ' (' + plannedDay.day + ')',
    planned: plannedDay.workout,
    type: plannedDay.type,
    status: progressData?.completed ? 'completed' : (progressData?.skipped ? 'skipped' : 'pending')
  };

  if (progressData) {
    // Add actual workout if different from planned
    if (progressData.actual_workout) {
      dayData.actual = progressData.actual_workout;
    }

    // Add run data if available
    if (progressData.distance_km) {
      dayData.data = {
        distanceKm: progressData.distance_km,
        durationSeconds: progressData.duration_seconds,
        avgPace: formatPace(progressData.distance_km, progressData.duration_seconds),
        avgHeartRate: progressData.avg_heart_rate,
        elevationMeters: progressData.elevation_meters,
        stravaUrl: progressData.strava_url
      };

      totalRunKm += progressData.distance_km || 0;
      totalElevation += progressData.elevation_meters || 0;
    }

    // Add comment if available
    if (progressData.comment) {
      dayData.comment = progressData.comment;
    }

    if (progressData.completed) {
      workoutsCompleted++;
    }
  }

  week3Data.days.push(dayData);
}

week3Data.summary = {
  totalRunKm: Math.round(totalRunKm * 100) / 100,
  totalElevation,
  workoutsCompleted: `${workoutsCompleted}/7`,
  notes: "Avtomatsko izvoženo iz aplikacije"
};

// Output the data
console.log('\n=== TEDEN 3 PODATKI ===\n');
console.log(JSON.stringify(week3Data, null, 2));

// Save to file
fs.writeFileSync('week3-exported-data.json', JSON.stringify(week3Data, null, 2));
console.log('\n✅ Podatki shranjeni v week3-exported-data.json');
