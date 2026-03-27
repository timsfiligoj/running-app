import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AthleteProfile {
  race_name: string;
  race_date: string;
  target_time: string;
  target_pace: string;
  experience: string;
  max_hr: number | null;
  weekly_volume: string;
  weaknesses: string;
  strengths: string;
  context: string;
}

const emptyProfile: AthleteProfile = {
  race_name: '',
  race_date: '',
  target_time: '',
  target_pace: '',
  experience: '',
  max_hr: null,
  weekly_volume: '',
  weaknesses: '',
  strengths: '',
  context: '',
};

interface AthleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AthleteProfileModal({ isOpen, onClose }: AthleteProfileModalProps) {
  const [profile, setProfile] = useState<AthleteProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) loadProfile();
  }, [isOpen]);

  const loadProfile = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('athlete_profile')
      .select('*')
      .eq('id', 'default')
      .single();

    if (data) {
      setProfile({
        race_name: data.race_name || '',
        race_date: data.race_date || '',
        target_time: data.target_time || '',
        target_pace: data.target_pace || '',
        experience: data.experience || '',
        max_hr: data.max_hr || null,
        weekly_volume: data.weekly_volume || '',
        weaknesses: data.weaknesses || '',
        strengths: data.strengths || '',
        context: data.context || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('athlete_profile').upsert({
      id: 'default',
      ...profile,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClose = () => {
    setSaved(false);
    onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Atletski profil</h2>
              <p className="text-xs text-gray-500">Kontekst za AI analizo tekov</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* Race info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciljna tekma</label>
                  <input
                    type="text"
                    value={profile.race_name}
                    onChange={(e) => setProfile(p => ({ ...p, race_name: e.target.value }))}
                    placeholder="Istrski polmaraton"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum tekme</label>
                  <input
                    type="date"
                    value={profile.race_date}
                    onChange={(e) => setProfile(p => ({ ...p, race_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciljni čas</label>
                  <input
                    type="text"
                    value={profile.target_time}
                    onChange={(e) => setProfile(p => ({ ...p, target_time: e.target.value }))}
                    placeholder="sub 1:35:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciljni tempo</label>
                  <input
                    type="text"
                    value={profile.target_pace}
                    onChange={(e) => setProfile(p => ({ ...p, target_pace: e.target.value }))}
                    placeholder="4:30 /km"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max HR (bpm)</label>
                  <input
                    type="number"
                    value={profile.max_hr || ''}
                    onChange={(e) => setProfile(p => ({ ...p, max_hr: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="190"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Running background */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tekaška izkušnja</label>
                <input
                  type="text"
                  value={profile.experience}
                  onChange={(e) => setProfile(p => ({ ...p, experience: e.target.value }))}
                  placeholder="npr. 2 leti, 3 polmaratoni, PR 1:38"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tedenski volumen</label>
                <input
                  type="text"
                  value={profile.weekly_volume}
                  onChange={(e) => setProfile(p => ({ ...p, weekly_volume: e.target.value }))}
                  placeholder="npr. 35-50 km/teden"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Strengths & Weaknesses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prednosti</label>
                <textarea
                  value={profile.strengths}
                  onChange={(e) => setProfile(p => ({ ...p, strengths: e.target.value }))}
                  placeholder="npr. dobra aerobna baza, močne noge od kolesarjenja"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Šibkosti / na čem delam</label>
                <textarea
                  value={profile.weaknesses}
                  onChange={(e) => setProfile(p => ({ ...p, weaknesses: e.target.value }))}
                  placeholder="npr. padec tempa po 15km, prenizka kadenca na klancu"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Free context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dodaten kontekst za analizo</label>
                <textarea
                  value={profile.context}
                  onChange={(e) => setProfile(p => ({ ...p, context: e.target.value }))}
                  placeholder="Karkoli relevantnega: poškodbe, prehrana, spanec, cilji poleg tekme, specifična vprašanja za analizo..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Ti podatki se uporabijo pri vsaki AI analizi teka
          </p>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Shranjeno
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300"
            >
              {saving ? 'Shranjujem...' : 'Shrani'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
