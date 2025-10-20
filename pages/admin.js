/// pages/admin.js
import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';

export default function Admin() {
  const [forms, setForms] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (userData?.role === 'admin') {
        const { data, error } = await supabase
          .from('forms')
          .select('*, users:users (email)')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Fehler beim Abrufen:', error);
        } else {
          setForms(data);
        }
      }
    });
  }, []);

  return (
    <div>
      <h1>Alle Formulare</h1>
      {forms.map(f => (
        <div key={f.id} style={{ border: '1px solid #ccc', marginBottom: 10, padding: 10 }}>
          <p><strong>Benutzer:</strong> {f.users?.email || 'Unbekannt'}</p>
          <p><strong>Stadt:</strong> {f.city}</p>
          <p><strong>Status:</strong> {f.status}</p>
        </div>
      ))}
    </div>
  );
}