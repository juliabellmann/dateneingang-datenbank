// pages/form/[id].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import supabase from '../../lib/supabaseClient';
import styled from 'styled-components';
// npm install react-toastify
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// import { useState } from "react";

export default function Form() {
  const router = useRouter();
  const { id } = router.query;

const [files, setFiles] = useState({
  image: null,
  one: null,
  two: null,
  three: null,
});

const [previews, setPreviews] = useState({
  image: null,
  one: null,
  two: null,
  three: null,
});

// hier das neue Formularfeld ergänzen
  const [formData, setFormData] = useState({
    city: '',
    street: '',
    landkreis: '',
    bundesland: '',
    region: '',
    konjunktur: '',
    standard: '',
    status: 'draft',
    objektbezeichnung: '', 
    baubeginn: "",
    bauende: "",
    planungsbeginn: "",
    vergabedatum: "",
    allgemeine_objektinformation: "",
    baukonstruktion: "",
    technische_anlagen: '',
    beschreibung_sonstiges: '',
    nuf: "",
    vf: "",
    tf: "",
    bgf: '',
    image_file_path: null,
    upload_one_path: null,
    upload_two_path: null,
    upload_three_path: null,
  });

  const [isReadonly, setIsReadonly] = useState(false); // ⬅️ Zustand zum Sperren des Formulars
  // Hilfsfunktion: signed URL für bestehendes Bild erzeugen
  async function refreshSignedUrl(key, filePath) {
  if (!filePath) {
    setPreviews(prev => ({ ...prev, [key]: null }));
    return;
  }

  const { data, error } = await supabase
    .storage
    .from('form_files')
    .createSignedUrl(filePath, 60 * 10);

  if (error) {
    console.error('Signed URL Fehler:', error);
    setPreviews(prev => ({ ...prev, [key]: null }));
    return;
  }

  setPreviews(prev => ({ ...prev, [key]: data.signedUrl }));
}


    // Formular laden
  useEffect(() => {
    if (id && id !== 'new') {
      supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single()
        .then(async ({ data, error }) => {
          if (error) {
            console.error(error);
            return;
          }
          if (data) {
            setFormData(prev => ({ ...prev, ...data }));
            if (data.status === 'submitted') setIsReadonly(true);
            if (data.image_file_path)
              await refreshSignedUrl('image', data.image_file_path);

            if (data.upload_one_path)
              await refreshSignedUrl('one', data.upload_one_path);

            if (data.upload_two_path)
              await refreshSignedUrl('two', data.upload_two_path);

            if (data.upload_three_path)
              await refreshSignedUrl('three', data.upload_three_path);
          }
        });
    }
  }, [id]);

    // Datei-Auswahl
  function handleFileChange(key, e) {
    const f = e.target.files?.[0] || null;

    setFiles(prev => ({ ...prev, [key]: f }));

    if (!f) {
      setPreviews(prev => ({ ...prev, [key]: null }));
      return;
    }

    if (f.type.startsWith('image/')) {
      const localUrl = URL.createObjectURL(f);
      setPreviews(prev => ({ ...prev, [key]: localUrl }));
    } else {
      setPreviews(prev => ({ ...prev, [key]: null }));
    }
  }

    // Upload ins private Bucket, Pfad = auth.uid()/timestamp-filename
async function uploadFile(fileToUpload) {
  // Prüfe aktuellen User
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  console.log('uploadFile - auth.getUser result:', userData, userErr);
  if (userErr || !userData?.user) throw new Error('Nicht eingeloggt');
  const userId = userData.user.id;

  // Baue Dateipfad (wichtig für RLS-Policy wenn Pfad-Check verwendet wird)
  const filePath = `${userId}/${Date.now()}-${fileToUpload.name}`;
  console.log('uploadFile - filePath:', filePath, 'file type:', fileToUpload.type);

  const { data, error: upErr } = await supabase
    .storage
    .from('form_files')
    .upload(filePath, fileToUpload, {
      cacheControl: '3600',
      upsert: false,
      contentType: fileToUpload.type,
    });

  console.log('uploadFile - upload result:', { data, upErr });
  if (upErr) throw upErr;
  return filePath;
}

    // Speichern (Zwischenspeichern / Aktualisieren)
   const handleSave = async () => {
    if (isReadonly) return;

    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        toast.error('Bitte einloggen.');
        return;
      }

      let {
        image_file_path,
        upload_one_path,
        upload_two_path,
        upload_three_path,
      } = formData;

      if (files.image) image_file_path = await uploadFile(files.image);
      if (files.one) upload_one_path = await uploadFile(files.one);
      if (files.two) upload_two_path = await uploadFile(files.two);
      if (files.three) upload_three_path = await uploadFile(files.three);

      const payload = {
        ...formData,
        user_id: userRes.user.id,
        status: 'draft',
        image_file_path,
        upload_one_path,
        upload_two_path,
        upload_three_path,
      };

      setFiles({ image: null, one: null, two: null, three: null });

      if (id === 'new') {
        const { error: insertErr } = await supabase.from('forms').insert(payload);
        if (insertErr) throw insertErr;
        toast.success('Formular erfolgreich zwischengespeichert!', { position: 'top-right' });
      } else {
        const { error: updateErr } = await supabase.from('forms').update(payload).eq('id', id);
        if (updateErr) throw updateErr;
        toast.success('Änderungen wurden gespeichert.', { position: 'top-center' });
      }
      setFormData(prev => ({
        ...prev,
        image_file_path,
        upload_one_path,
        upload_two_path,
        upload_three_path,
      }));

      if (image_file_path)
        await refreshSignedUrl('image', image_file_path);

      if (upload_one_path)
        await refreshSignedUrl('one', upload_one_path);

      if (upload_two_path)
        await refreshSignedUrl('two', upload_two_path);

      if (upload_three_path)
        await refreshSignedUrl('three', upload_three_path);

    } catch (error) {
      console.error('handleSave error:', error);
      toast.error(`Beim Speichern ist ein Fehler aufgetreten: ${error?.message || error}`);
    }
  };

  // Absenden (final)
  const handleSubmit = async () => {
    if (isReadonly) return;
    const { error } = await supabase.from('forms').update({ ...formData, status: 'submitted' }).eq('id', id);
    if (error) {
      console.error(error);
      toast.error('Fehler beim Absenden.');
      return;
    }
    router.push('/dashboard');
  };

  // PDF Download
  const downloadPdf = () => {
    window.open(`/api/downloadPdf?id=${id}`, '_blank');
  };
  
const handleDownloadFile = async (filePath) => {
  if (!filePath) {
    toast.error('Keine Datei vorhanden.');
    return;
  }

  try {
    const { data, error } = await supabase
      .storage
      .from('form_files')
      .createSignedUrl(filePath, 60 * 10);

    if (error) throw error;

    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = filePath.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error(err);
    toast.error('Download fehlgeschlagen.');
  }
};

  return (
      <>
    <StyledSite>
      <h1>Formular</h1>

      {/* Hinweis bei gesperrtem Formular */}
      {isReadonly && (
        <p style={{ backgroundColor: '#eee', padding: '1rem', marginBottom: '1rem' }}>
          Dieses Formular wurde bereits eingereicht und ist nicht mehr bearbeitbar.
        </p>
      )}

      <form>

        <StyledFieldset>
        {/* Allgemeine Angaben - Excel Reiter: Beschreibung*/}
          <legend><h2>1. Allgemeine Angaben</h2></legend>

          <div className="spacebetween">
            <label htmlFor="bauherr">Bauherr: </label>
            <input
              id="bauherr"
              placeholder="Bauherr"
              value={formData.bauherr}
              onChange={e => setFormData({ ...formData, bauherr: e.target.value })}
              readOnly={isReadonly}
              />
          </div>
          <div className="spacebetween">
            <label htmlFor="objektbezeichnung">Objektbezeichnung / Art der Nutzung: </label>
            <input
              id="objektbezeichnung"
              placeholder="Objektbezeichnung"
              value={formData.objektbezeichnung}
              onChange={e => setFormData({ ...formData, objektbezeichnung: e.target.value })}
              readOnly={isReadonly}
              />
          </div>
        <p>Objektstandort: </p>
          <div className="spacebetween">
            <label htmlFor="city">Postleiztahl und Stadt: </label>
            <input
              id="city"
              placeholder="Stadt"
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              readOnly={isReadonly}
              />
          </div>

          <div className="spacebetween">
            <label htmlFor="street">Straße und Hausnummer: </label>
            <input
              id="street"
              placeholder="Straße und Hausnummer"
              value={formData.street}
              onChange={e => setFormData({ ...formData, street: e.target.value })}
              readOnly={isReadonly}
              />
          </div>
          <div className="spacebetween">
            <label htmlFor="landkreis">Landkreis: </label>
            <input
              id="landkreis"
              placeholder="Landkreis"
              value={formData.landkreis}
              onChange={e => setFormData({ ...formData, landkreis: e.target.value })}
              readOnly={isReadonly}
              />
          </div>
          <div className="spacebetween">
            <label htmlFor="bundesland">Bundesland: </label>
            <input
              id="bundesland"
              placeholder="Bundesland"
              value={formData.bundesland}
              onChange={e => setFormData({ ...formData, bundesland: e.target.value })}
              readOnly={isReadonly}
              />
          </div>


        <p>Bauzeiten: </p>
          <div className="spacebetween">
            <label htmlFor="planungsbeginn">Planungsbeginn: </label>
            <input
              type="date"
              id="planungsbeginn"
              value={formData.planungsbeginn}
              onChange={e => setFormData({ ...formData, planungsbeginn: e.target.value })}
              readOnly={isReadonly}
              />
          </div>
          <div className="spacebetween">
            <label htmlFor="vergabedatum">Haupt-/Rohbauvergabe: </label>
            <input
              type="date"
              id="vergabedatum"
              value={formData.vergabedatum}
              onChange={e => setFormData({ ...formData, vergabedatum: e.target.value })}
              readOnly={isReadonly}
              />
          </div>
          <div className="spacebetween">
            <label htmlFor="baubeginn">Baubeginn: </label>
            <input
              type="date"
              id="baubeginn"
              value={formData.baubeginn}
              onChange={e => setFormData({ ...formData, baubeginn: e.target.value })}
              readOnly={isReadonly}
              />
          </div>
          <div className="spacebetween">
            <label htmlFor="bauende">Bauende: </label>
            <input
              type="date"
              id="bauende"
              value={formData.bauende}
              onChange={e => setFormData({ ...formData, bauende: e.target.value })}
              readOnly={isReadonly}
              />
          </div>
              <p> Copyrights für die Fotos: </p>
          <div className="spacebetween">
            <label htmlFor="fotograf">Copyright liegt bei: </label>
            <input
              id="fotograf"
              placeholder="Fotograf"
              value={formData.fotograf}
              onChange={e => setFormData({ ...formData, fotograf: e.target.value })}
              readOnly={isReadonly}
              />
          </div>
        </StyledFieldset>

        <StyledButton type="button" onClick={handleSave} disabled={isReadonly}>
          Zwischenspeichern
        </StyledButton>

        <StyledFieldset>
          <legend><h2>2. Objektbeschreibung</h2></legend>

          <div className="spacebetween">
            <label htmlFor="allgemeine_objektinformation">Allgemeine Objektinformation:</label>
            <textarea
              id="allgemeine_objektinformation"
              placeholder="Beschreibe das Objekt hier..."
              value={formData.allgemeine_objektinformation}
              onChange={e => setFormData({ ...formData, allgemeine_objektinformation: e.target.value })}
              readOnly={isReadonly}
              rows={5}
            />
          </div>

          <div className="spacebetween">
            <label htmlFor="baukonstruktion">Baukonstruktion: </label>
            <textarea
              id="baukonstruktion"
              placeholder="Beschreibe das Objekt hier..."
              value={formData.baukonstruktion}
              onChange={e => setFormData({ ...formData, baukonstruktion: e.target.value })}
              readOnly={isReadonly}
              rows={5}
            />
          </div>

          <div className="spacebetween">
            <label htmlFor="technische_anlagen">Technische Anlagen: </label>
            <textarea
              id="technische_anlagen"
              placeholder="Beschreibe das Objekt hier..."
              value={formData.technische_anlagen}
              onChange={e => setFormData({ ...formData, technische_anlagen: e.target.value })}
              readOnly={isReadonly}
              rows={5}
            />
          </div>

          <div className="spacebetween">
            <label htmlFor="beschreibung_sonstiges">Sonstiges: </label>
            <textarea
              id="beschreibung_sonstiges"
              placeholder="Beschreibe das Objekt hier..."
              value={formData.beschreibung_sonstiges}
              onChange={e => setFormData({ ...formData, beschreibung_sonstiges: e.target.value })}
              readOnly={isReadonly}
              rows={5}
            />
          </div>

        </StyledFieldset>

        <StyledButton type="button" onClick={handleSave} disabled={isReadonly}>
          Zwischenspeichern
        </StyledButton>
        
        <StyledFieldset>
          <legend><h2>3. Kosteneinflüsse</h2></legend>


        <h3>Region</h3>
          <StyledRadiobuttons>
            <label>
              <input
                type="radio"
                name="region"
                value="land"
                checked={formData.region === 'land'}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
                disabled={isReadonly}
              /> ländlich
            </label>
            <label>
              <input
                type="radio"
                name="region"
                value="stadt"
                checked={formData.region === 'stadt'}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
                disabled={isReadonly}
              /> Stadt
            </label>
            <label>
              <input
                type="radio"
                name="region"
                value="großstadt"
                checked={formData.region === 'großstadt'}
                onChange={e => setFormData({ ...formData, region: e.target.value })}
                disabled={isReadonly}
              /> Großstadt
            </label>
          </StyledRadiobuttons>

        <h3>Konjunktur</h3>
          <StyledRadiobuttons>
            <label>
              <input
                type="radio"
                name="konjunktur"
                value="schwach"
                checked={formData.konjunktur === 'schwach'}
                onChange={e => setFormData({ ...formData, konjunktur: e.target.value })}
                disabled={isReadonly}
              /> schwach
            </label>
            <label>
              <input
                type="radio"
                name="konjunktur"
                value="mittel"
                checked={formData.konjunktur === 'mittel'}
                onChange={e => setFormData({ ...formData, konjunktur: e.target.value })}
                disabled={isReadonly}
              /> mittel
            </label>
            <label>
              <input
                type="radio"
                name="konjunktur"
                value="hoch"
                checked={formData.konjunktur === 'hoch'}
                onChange={e => setFormData({ ...formData, konjunktur: e.target.value })}
                disabled={isReadonly}
              /> hoch
            </label>
          </StyledRadiobuttons>


        <h3>Standard</h3>
          <StyledRadiobuttons>
            <label>
              <input
                type="radio"
                name="standard"
                value="schwach"
                checked={formData.standard === 'schwach'}
                onChange={e => setFormData({ ...formData, standard: e.target.value })}
                disabled={isReadonly}
              /> schwach
            </label>
            <label>
              <input
                type="radio"
                name="standard"
                value="mittel"
                checked={formData.standard === 'mittel'}
                onChange={e => setFormData({ ...formData, standard: e.target.value })}
                disabled={isReadonly}
              /> mittel
            </label>
            <label>
              <input
                type="radio"
                name="standard"
                value="hoch"
                checked={formData.standard === 'hoch'}
                onChange={e => setFormData({ ...formData, standard: e.target.value })}
                disabled={isReadonly}
              /> hoch
            </label>
          </StyledRadiobuttons>
        </StyledFieldset>

        <StyledButton type="button" onClick={handleSave} disabled={isReadonly}>
          Zwischenspeichern
        </StyledButton>

        <StyledFieldset>
          <legend><h2>4. Flächen und Rauminhalte nach DIN 277:2021-08</h2></legend>
          <div>
            <label htmlFor='nuf'>Nutzungsflächen: </label>
            <input
            type='number'
            id='nuf'
            step="0.01"
            min="0"
            value={formData.nuf}
            onChange={e => setFormData({ ...formData, nuf: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor='tf'>Technikfläche: </label>
            <input
            type='number'
            id='tf'
            step="0.01"
            min="0"
            value={formData.tf}
            onChange={e => setFormData({ ...formData, tf: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor='vf'>Verkehrsfläche: </label>
            <input
            type='number'
            id='vf'
            step="0.01"
            min="0"
            value={formData.vf}
            onChange={e => setFormData({ ...formData, vf: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor='bgf'>Brutto-Grundfläche: </label>
            <input
            type='number'
            id='bgf'
            step="0.01"
            min="0"
            value={formData.bgf}
            onChange={e => setFormData({ ...formData, bgf: e.target.value })}
            />
          </div>


        <div>
          <span>Netto-Raumfläche: </span>
          <span>
            {[
              // verhindert NaN bei leeren Feldern:
              parseFloat(formData.nuf) || 0, 
              parseFloat(formData.vf) || 0,
              parseFloat(formData.tf) || 0,
              parseFloat(formData.bgf) || 0,
            ]
            // summieren von Zahlen:
              .reduce((a, b) => a + b, 0)
              .toFixed(2)
              .replace('.', ',')}
          </span>
          <span> m²</span>
        </div>



        </StyledFieldset>

        <StyledButton type="button" onClick={handleSave} disabled={isReadonly}>
          Zwischenspeichern
        </StyledButton>
        
        <StyledFieldset>
          <legend><h2>5. Kosten nach DIN 276:2018-12</h2></legend>
        </StyledFieldset>

        <StyledButton type="button" onClick={handleSave} disabled={isReadonly}>
          Zwischenspeichern
        </StyledButton>
        
<StyledFieldset>
  <legend><h2>6. weitere Projektangaben</h2></legend>

  {['image', 'one', 'two', 'three'].map((key) => {
    const filePath = formData[`${key}_file_path`] || formData[`upload_${key}_path`];
    const labelMap = {
      image: 'Upload Hauptdatei',
      one: 'Upload eins',
      two: 'Upload zwei',
      three: 'Upload drei',
    };

    return (
      <div key={key} style={{ marginBottom: '1rem' }}>
        <label>{labelMap[key]}:</label>

        {/* verstecktes File-Input */}
        <input
          type="file"
          id={`file-${key}`}
          style={{ display: 'none' }}
          onChange={e => handleFileChange(key, e)}
          disabled={isReadonly}
        />

        {/* eigener Button */}
        <StyledButton
          type="button"
          onClick={() => document.getElementById(`file-${key}`).click()}
          disabled={isReadonly}
        >
          Datei auswählen
        </StyledButton>

        {/* Anzeige gewählter Datei oder bestehender Pfad */}
        <span style={{ marginLeft: '1rem' }}>
          {files[key]?.name || (filePath ? filePath.split('/').pop() : 'Keine Datei ausgewählt')}
        </span>

        {/* Vorschau bei Bilddateien */}
        {previews[key] && (
          <div style={{ marginTop: '0.5rem' }}>
            <img src={previews[key]} alt="Vorschau" width={200} />
          </div>
        )}

        {/* Download-Button nur bei readonly */}
        {isReadonly && filePath && (
          <StyledButton
            type="button"
            onClick={() => handleDownloadFile(filePath)}
            style={{ marginTop: '0.5rem' }}
          >
            Datei herunterladen
          </StyledButton>
        )}
      </div>
    );
  })}
</StyledFieldset>


        
        {/* Buttons deaktivieren, wenn readonly */}
        <StyledButton type="button" onClick={handleSave} disabled={isReadonly}>
          Zwischenspeichern
        </StyledButton>
              <StyledButton type="button" onClick={() => router.push('/dashboard')}>
        Zurück zur Übersicht
      </StyledButton>
        <StyledButton type="button" onClick={handleSubmit} disabled={isReadonly}>
          Absenden
        </StyledButton>
      </form>

          {/* ⬇️ Zurück-Button nur im readonly-Modus */}
    {isReadonly && (
    <>
      <StyledBackButton type="button" onClick={() => router.push('/dashboard')}>
        Zurück zur Übersicht
      </StyledBackButton>
      <StyledButton type="button" onClick={downloadPdf}>
        PDF herunterladen
      </StyledButton>
    </>
    )}
    <ToastContainer position="top-right" />
    </StyledSite>
    </>
  );
}

const StyledSite = styled.div`
 display: flex;
  flex-direction: column;
  align-items: center;
   /* background-color: rgba(198,220,225,.2);
  margin: 5rem 15rem;
  padding: 0 0 3rem 0; */
`;

const StyledFieldset = styled.fieldset`
  background-color: var(--bg-color-highlight);
  width: 1400px;

  div {
    /* Breite des Inhalts im fieldset */
    width: 50%;
  }


`;

const StyledButton = styled.button`
  background-color: #b5a286;
  color: white;
  border: none;
  padding: 10px 16px;
  margin: 2rem 1rem;
  cursor: pointer;

  &:hover {
    background-color: #b5a286;
    text-decoration: underline;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    text-decoration: none;
  }
`;

const StyledRadiobuttons = styled.div`
  // background-color: green;
    display: flex;
  flex-direction: row;
  gap: 1.5rem;
  align-items: center;
  
`;

const StyledBackButton = styled.button`
  background-color: #777;
  color: white;
  border: none;
  padding: 10px 16px;
  margin: 2rem 1rem;
  cursor: pointer;

  &:hover {
    background-color: #555;
  }
`;