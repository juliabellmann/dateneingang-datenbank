// pages/dashboard.js
import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import styled from 'styled-components';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [forms, setForms] = useState([]);
  const [profile, setProfile] = useState(null);
  const router = useRouter();
  const [userRole, setUserRole] = useState('user'); // bleibt 'user' ohne role-Feld

  useEffect(() => {
    const getUserFormsAndProfile = async () => {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/');
        return;
      }

      setUser(user);

      // 📥 Profil laden — nur vorhandene Felder anfragen (ohne role)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_name, company_street, company_house_nr, company_zip, company_city, company_contact_person, isadmin')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Fehler beim Laden des Profils:', profileError.message || profileError);
      } else {
        setProfile(profileData);
        // Falls du isAdmin später verwenden möchtest:
        if (profileData?.isadmin) setUserRole('admin');
      }


      // -------------------------
      // 1) Forms laden (abhängig von role)
      // -------------------------
      let formsQuery = supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileData?.isadmin) {
        // Admin sieht alle eingereichten Formulare
        formsQuery = formsQuery.eq('status', 'submitted');
        setUserRole('admin');
      } else {
        // Normaler Nutzer sieht nur eigene Formulare
        formsQuery = formsQuery.eq('user_id', user.id);
      }

      const { data: formsData, error: formsError } = await formsQuery;

      if (formsError) {
        console.error('Fehler beim Laden der Formulare:', formsError.message || formsError);
        setForms([]);
        return;
      }

      if (!formsData || formsData.length === 0) {
        setForms([]);
        return;
      }

      // -------------------------
      // 2) Profiles für alle forms per IN abfragen
      // -------------------------
      const userIds = Array.from(new Set(formsData.map((f) => f.user_id).filter(Boolean)));
      let profilesMap = {};

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, company_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('Fehler beim Laden der zugehörigen Profiles:', profilesError.message || profilesError);
          // trotzdem die forms ohne enrichment setzen
          const fallbackForms = formsData.map(f => ({ ...f, company_name: null }));
          setForms(fallbackForms);
          return;
        }

        // Map userId -> profile
        profilesMap = profilesData.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      // -------------------------
      // 3) Forms mit company_name anreichern
      // -------------------------
      const enrichedForms = formsData.map((f) => ({
        ...f,
        company_name: profilesMap[f.user_id]?.company_name ?? null,
      }));

      setForms(enrichedForms);
    };

    getUserFormsAndProfile();
  }, [router]);

  const handleNewForm = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session || !session.user) {
      alert("Benutzer nicht angemeldet oder keine Session vorhanden");
      console.error("Session-Fehler:", sessionError);
      return;
    }

    const userId = session.user.id;

    const { data, error } = await supabase
      .from("forms")
      .insert({
        user_id: userId,
        // city: "",
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("❌ INSERT-Fehler:", error);
      alert("Fehler beim Erstellen des Formulars");
      return;
    }

    router.push(`/form/${data.id}`);
  };

  const continueForm = (id) => {
    router.push(`/form/${id}`);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert('Fehler beim Abmelden');
      console.error(error);
    } else {
      router.push('/');
    }
  };

  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  // Funktion, um die Forms-Liste neu zu laden (wie in useEffect)
const refreshForms = async () => {
  if (!user) return;

  const { data: profileData } = await supabase
    .from('profiles')
    .select('company_name, isadmin')
    .eq('id', user.id)
    .single();

  setProfile(profileData);
  if (profileData?.isadmin) setUserRole('admin');

  let formsQuery = supabase
    .from('forms')
    .select('*')
    .order('created_at', { ascending: false });

  if (profileData?.isadmin) {
    formsQuery = formsQuery.eq('status', 'submitted');
  } else {
    formsQuery = formsQuery.eq('user_id', user.id);
  }

  const { data: formsData } = await formsQuery;
  if (!formsData) {
    setForms([]);
    return;
  }

  const userIds = Array.from(new Set(formsData.map((f) => f.user_id).filter(Boolean)));
  let profilesMap = {};
  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, company_name')
      .in('id', userIds);
    profilesMap = profilesData?.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}) || {};
  }

  const enrichedForms = formsData.map((f) => ({
    ...f,
    company_name: profilesMap[f.user_id]?.company_name ?? null,
  }));

  setForms(enrichedForms);
};

  return (
    <>
      <StyledDashboard>
        <StyledSection>
          <StyledContainer>
            {profile ? (
              <h2>Herzlich Willkommen <i>{profile.company_name || 'User'}</i></h2>
            ) : (
              <p>Profildaten konnten nicht geladen werden.</p>
            )}
          </StyledContainer>
        </StyledSection>

{userRole !== 'admin' && (
        <StyledSection>
          <StyledContainer>
            <h2>Ihre Profildaten:</h2>
            {profile ? (
              <div>
                <p><strong>Firmenname:</strong> {profile.company_name || '-'}</p>
                <p><strong>Straße:</strong> {profile.company_street || '-'} {profile.company_house_nr || ''}</p>
                <p><strong>PLZ / Ort:</strong> {profile.company_zip || '-'} {profile.company_city || '-'}</p>
                <p><strong>Ansprechpartner:</strong> {profile.company_contact_person || '-'}</p>
              </div>
            ) : (
              <p>Profildaten konnten nicht geladen werden.</p>
            )}
            <div>
              <StyledButton onClick={handleEditProfile}>Profil bearbeiten</StyledButton>
            </div>
          </StyledContainer>
        </StyledSection>
        )}
{userRole !== 'admin' && (
        <StyledSection>
          <StyledContainer>
            <h2>Projekt liefern</h2>
            <p>Das BKI unterstützt mit seinen Baukosten-Datenbanken die Architektenschaft und alle am Bau Beteiligten bei einer qualifizierten Baukostenermittlung...</p>
            <StyledForms>
              <StyledButton onClick={handleNewForm}>Projekt-Veröffentlichung bis zur 1. Ebene der DIN 276_Neubau (200,-Euro)*</StyledButton>
              <StyledButton onClick={handleNewForm}>Projekt-Veröffentlichung bis zur 3. Ebene der DIN 276_Neubau(700,-Euro)*</StyledButton>
            </StyledForms>
          </StyledContainer>
        </StyledSection>
        )}
        
        <StyledSection>
          <StyledContainer>
            <h2>{userRole === 'admin' ? 'Alle eingereichten Formulare' : 'Bereits bearbeitete Formulare:'}</h2>
            {forms.length === 0 ? (
              <p>Es wurden noch keine Formulare ausgefüllt.</p>
            ) : (
              <ul>
                {forms.map((form) => (
                  <StyledList key={form.id}>
                    {userRole === 'admin' && (
                      <>
                        🏢 {form.company_name || 'Unbekannte Firma'} –{' '}
                      </>
                    )}
                    📖Objekt: {form.objektbezeichnung || 'Noch nicht angegeben'} – Status: {form.status}
                    <div>
                      <StyledButton onClick={() => continueForm(form.id)}>
                        {form.status === 'draft' ? 'Weiter bearbeiten' : 'Ansehen'}
                      </StyledButton>

{form.status === 'submitted' && (
  <>
    {/* PDF Button */}
    <StyledButton
      onClick={() => window.open(`/api/downloadPdf?id=${form.id}`, '_blank')}
      style={{ backgroundColor: '#888' }}
    >
      PDF
    </StyledButton>

    {userRole === 'admin' && form.status === 'submitted' && (
  <StyledButton
    onClick={async () => {
      const { error } = await supabase
        .from('forms')
        .update({ status: 'draft' })
        .eq('id', form.id);

      if (error) {
        alert('Fehler beim Zurücksetzen auf Draft');
        console.error(error);
      } else {
        alert('Formular wurde auf Draft zurückgesetzt');
        // Forms neu laden
        await refreshForms();
      }
    }}
    style={{ backgroundColor: '#c66' }}
  >
    Auf Draft zurücksetzen
  </StyledButton>
)}

  </>
)}

                    </div>
                  </StyledList>
                ))}
              </ul>
            )}
          </StyledContainer>
        </StyledSection>

        <StyledButton onClick={handleLogout}>Abmelden</StyledButton>
      </StyledDashboard>
    </>
  );
}

const StyledDashboard = styled.div``;

const StyledSection = styled.section`
  background-color: var(--bg-color-highlight);
  display: flex;
  flex-direction: column;
  align-items:center;
  margin: 2rem 0;
  padding: 2rem 0;
`;

const StyledContainer = styled.div`
  width: 1400px;
  display: flex;
  flex-direction: column;
`;

const StyledButton = styled.button`
  background-color: #b5a286;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;

  &:hover {
    background-color: #b5a286;
    text-decoration: underline;
  }
`;

const StyledForms = styled.div`
  padding: 1rem;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;
`;

const StyledList = styled.li`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin: 0.5rem 0;
  height: 50px;
`;