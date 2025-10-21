// pages/admin.js
import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

export default function Admin() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error('Auth error:', userError);
        setLoading(false);
        return;
      }

      if (!user?.id) {
        console.warn('Kein eingeloggter Benutzer');
        setLoading(false);
        return;
      }

      // Check admin flag in profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('isAdmin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Fehler beim Laden des Profils:', profileError);
        setLoading(false);
        return;
      }

      if (!profile?.isAdmin) {
        console.warn('Kein Admin');
        setLoading(false);
        return;
      }

      // Admin: load all forms and include user email & profile info
      const { data, error } = await supabase
        .from('forms')
        // join auth.users for email and public.profiles for additional profile fields
        .select('*, users:users (email), profiles:profiles (company_name, isAdmin)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fehler beim Abrufen der Formulare:', error);
      } else {
        setForms(data || []);
      }

      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1>Alle Formulare</h1>

      {loading && <p>Lädt…</p>}

      {!loading && forms.length === 0 && <p>Keine Formulare gefunden.</p>}

      {forms.map((f) => (
        <div key={f.id} style={{ border: '1px solid #ccc', marginBottom: 10, padding: 10 }}>
          <p>
            <strong>Benutzer:</strong> {f.users?.email || f.profiles?.company_name || 'Unbekannt'}
            {f.profiles?.isAdmin ? ' (Admin)' : ''}
          </p>
          <p>
            <strong>Stadt:</strong> {f.city}
          </p>
          <p>
            <strong>Status:</strong> {f.status}
          </p>
        </div>
      ))}
    </div>
  );
}