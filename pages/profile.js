// pages/profile.js

import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    company_name: '',
    company_street: '',
    company_house_nr: '',
    company_zip: '',
    company_city: '',
    company_contact_person: ''
  });
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    });
  }, []);

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const updates = { ...profile, id: user.id };

    await supabase.from('profiles').upsert(updates); // INSERT or UPDATE
    router.push('/dashboard');
  };

  return (
    <div>
      <h1>Profil bearbeiten</h1>
      <input placeholder="Firmenname" value={profile.company_name} onChange={e => setProfile({ ...profile, company_name: e.target.value })} />
      <input placeholder="Straße" value={profile.company_street} onChange={e => setProfile({ ...profile, company_street: e.target.value })} />
      <input placeholder="Hausnummer" value={profile.company_house_nr} onChange={e => setProfile({ ...profile, company_house_nr: e.target.value })} />
      <input placeholder="PLZ" value={profile.company_zip} onChange={e => setProfile({ ...profile, company_zip: e.target.value })} />
      <input placeholder="Ort" value={profile.company_city} onChange={e => setProfile({ ...profile, company_city: e.target.value })} />
      <input placeholder="Ansprechpartner" value={profile.company_contact_person} onChange={e => setProfile({ ...profile, company_contact_person: e.target.value })} />
      <button onClick={handleSave}>Speichern</button>
    </div>
  );
}