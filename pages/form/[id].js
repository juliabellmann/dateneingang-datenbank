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

  // Datei + Bildvorschau (signed URL oder lokale Vorschau)
  const [file, setFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);


// hier das neue Formularfeld ergänzen
  const [formData, setFormData] = useState({
    city: '',
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
    image_file_path: null, // <-- Pfad im Storage (privater Bucket)
  });

  const [isReadonly, setIsReadonly] = useState(false); // ⬅️ Zustand zum Sperren des Formulars
  // Hilfsfunktion: signed URL für bestehendes Bild erzeugen
  async function refreshSignedUrl(filePath) {
    if (!filePath) {
      setImagePreviewUrl(null);
      return;
    }
    const { data, error } = await supabase
      .storage
      .from('form-images')
      .createSignedUrl(filePath, 60 * 10); // 10 Minuten
    if (error) {
      console.error('Signed URL Fehler:', error);
      setImagePreviewUrl(null);
      return;
    }
    setImagePreviewUrl(data.signedUrl);
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
            if (data.image_file_path) await refreshSignedUrl(data.image_file_path);
          }
        });
    }
  }, [id]);

    // Datei-Auswahl
  function handleFileChange(e) {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setFile(f);
    // lokale Vorschau (vor dem Upload)
    if (f) {
      const localUrl = URL.createObjectURL(f);
      setImagePreviewUrl(localUrl);
    } else {
      // wenn abgewählt
      refreshSignedUrl(formData.image_file_path);
    }
  }

    // Upload ins private Bucket, Pfad = auth.uid()/timestamp-filename
  async function uploadImage(fileToUpload) {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) throw new Error('Nicht eingeloggt');
    const userId = userData.user.id;

    const filePath = `${userId}/${Date.now()}-${fileToUpload.name}`;

    const { error: upErr } = await supabase
      .storage
      .from('form-images')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileToUpload.type,
      });

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

      let image_file_path = formData.image_file_path;

      // Falls neue Datei gewählt → hochladen und Pfad übernehmen
      if (file) {
        image_file_path = await uploadImage(file);
      }

      const payload = {
        ...formData,
        user_id: userRes.user.id,
        status: 'draft',
        image_file_path,
      };

      if (id === 'new') {
        const { error: insertErr } = await supabase.from('forms').insert(payload);
        if (insertErr) throw insertErr;
        toast.success('Formular erfolgreich zwischengespeichert!', { position: 'top-right' });
      } else {
        const { error: updateErr } = await supabase.from('forms').update(payload).eq('id', id);
        if (updateErr) throw updateErr;
        toast.success('Änderungen wurden gespeichert.', { position: 'top-center' });
      }

      // Nach dem Speichern ggf. neue signed URL laden (falls neues Bild)
      if (image_file_path) await refreshSignedUrl(image_file_path);
      setFormData(prev => ({ ...prev, image_file_path }));
      setFile(null);
    } catch (error) {
      console.error(error);
      toast.error('Beim Speichern ist ein Fehler aufgetreten.', { position: 'top-center' });
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

  // const toggleSize = (val) => {
  //   if (isReadonly) return;
  //   setFormData(prev => ({
  //     ...prev,
  //     size: prev.size.includes(val) ? prev.size.filter(s => s !== val) : [...prev.size, val],
  //   }));
  // };

  // PDF Download
  const downloadPdf = () => {
    window.open(`/api/downloadPdf?id=${id}`, '_blank');
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
        {/* Allgemeine Angaben */}
          <legend><h2>1. Allgemeine Angaben</h2></legend>

          <div className="spacebetween">
            <label htmlFor="objektbezeichnung">Objektbezeichnung: </label>
            <input
              id="objektbezeichnung"
              placeholder="Objektbezeichnung"
              value={formData.objektbezeichnung}
              onChange={e => setFormData({ ...formData, objektbezeichnung: e.target.value })}
              readOnly={isReadonly}
              />
          </div>

          <div className="spacebetween">
            <label htmlFor="city">Stadt: </label>
            <input
              id="city"
              placeholder="Stadt"
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              readOnly={isReadonly}
              />
          </div>


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
              placeholder="Zwar wurden Varianten für die Energieversorgung berechnet, dennoch musste das Passivhaus an Fernwärme angeschlossen werden. Sie wird an einen gemeinsamen Speicher übergeben, an den auch Flachkollektoren angeschlossen sind. Um eine Nachrüstung von Photovoltaikelementen zu vereinfachen, wurden Leerrohre verlegt. Jede Wohnung erhielt eine Zu- und Abluftanlage mit Wärmerückgewinnung. Die Luftdichtheit der Gebäude wurde mit einem Blower-Door-Test geprüft. Die passivhaustauglichen Holz-Aluminium-Fenster mit Dreifachverglasung sind zudem hoch schalldämmend."
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
              placeholder="Der kompakte Baukörper hat eine weinrote Holzfassade und ein hellgraues Staffelgeschoss. Auf der Nordseite wurden neben den Fenstern rückseitig lackierte Gläser eingesetzt. Sie lassen die Fensterformate breiter erscheinen, während innen flexibel möbliert werden kann. Die Holzinnendecken wurden weiß lasiert. Als weiteres Gestaltungselement wurden in den Treppenaugen Regale eingebaut. Den Vorbereich prägen optisch abgetrennte Carports und ein Holzsteg unter einem Glasvordach. Der Bereich hinter dem Haus wurde mit Erde angefüllt und erhielt eine Gartenanlage mit einer Trockenmauer."
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

            {/* Bild hochladen */}
            <div>
              <label>Bild hochladen:</label>
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={isReadonly} />
              {imagePreviewUrl && (
                <div>
                  <p>Aktuelles Bild:</p>
                  <img src={imagePreviewUrl} alt="Formular Bild" width={200} />
                </div>
              )}
            </div>
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