// pages/profile/edit.js

import { useEffect, useState } from 'react';
import supabase from '../../lib/supabaseClient';
import { useRouter } from 'next/router';
import styled from 'styled-components';

export default function EditProfile() {
  const [profile, setProfile] = useState({
    company_name: '',
    company_street: '',
    company_house_nr: '',
    company_zip: '',
    company_city: '',
    company_contact_person: '',
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/'); // Nicht eingeloggt → zurück zur Startseite
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('company_name, company_street, company_house_nr, company_zip, company_city, company_contact_person')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Fehler beim Laden des Profils:', error.message);
      } else if (data) {
        setProfile(data);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('Nicht eingeloggt');
      router.push('/');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...profile }, { onConflict: 'id' });

    if (error) {
      alert('Fehler beim Speichern: ' + error.message);
    } else {
      alert('Profil erfolgreich gespeichert!');
      router.push('/dashboard');
    }
  };

  if (loading) return <p>Lade Profildaten...</p>;

  return (
    <StyledContainer>
      <h1>Profil bearbeiten</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Firmenname:
          <input
            type="text"
            name="company_name"
            value={profile.company_name}
            onChange={handleChange}
            // required
          />
        </label>

        <label>
          Straße:
          <input
            type="text"
            name="company_street"
            value={profile.company_street}
            onChange={handleChange}
            // required
          />
        </label>

        <label>
          Hausnummer:
          <input
            type="text"
            name="company_house_nr"
            value={profile.company_house_nr}
            onChange={handleChange}
            // required
          />
        </label>

        <label>
          PLZ:
          <input
            type="text"
            name="company_zip"
            value={profile.company_zip}
            onChange={handleChange}
            // required
          />
        </label>

        <label>
          Ort:
          <input
            type="text"
            name="company_city"
            value={profile.company_city}
            onChange={handleChange}
            // required
          />
        </label>

        <label>
          Ansprechpartner:
          <input
            type="text"
            name="company_contact_person"
            value={profile.company_contact_person}
            onChange={handleChange}
            // required
          />
        </label>

        <StyledButton type="submit">Speichern</StyledButton>
      </form>
    </StyledContainer>
  );
}

const StyledContainer = styled.div`
  max-width: 600px;
  margin: 3rem auto;
  padding: 2rem;
  background-color: var(--bg-color-highlight);
  border-radius: 8px;

  h1 {
    margin-bottom: 2rem;
  }

  form {
    display: flex;
    flex-direction: column;

    label {
      margin-bottom: 1rem;
      font-weight: 600;

      input {
        margin-top: 0.3rem;
        padding: 0.5rem;
        font-size: 1rem;
        width: 100%;
        box-sizing: border-box;
      }
    }
  }
`;

const StyledButton = styled.button`
  background-color: #b5a286;
  color: white;
  border: none;
  padding: 0.7rem 1.2rem;
  font-size: 1.1rem;
  cursor: pointer;
  margin-top: 1.5rem;
  align-self: flex-start;

  &:hover {
    background-color: #a49476;
  }
`;