// pages/form/[id].js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import supabase from '../../lib/supabaseClient';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Form() {
  const router = useRouter();
  const { id } = router.query;

// Einzelne ausgewählte Dateien (temporär vor Upload)
  const [selectedFiles, setSelectedFiles] = useState({
    calculations: null,
    drawings: null,
    other: null,
  });

  // Vorschau / signed URLs für bereits hochgeladene Objekte
  const [filePreviews, setFilePreviews] = useState({
    calculations: null,
    drawings: null,
    other: null,
  });

  // Metadaten der hochgeladenen Dateien aus public.form_files
  const [storedFiles, setStoredFiles] = useState({
    calculations: null,
    drawings: null,
    other: null,
  });

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
    bueroAnzNe: "",
    allgemeine_objektinformation: "",
    baukonstruktion: "",
    technische_anlagen: '',
    beschreibung_sonstiges: '',
    nuf: "",
    vf: "",
    tf: "",
    bgf: '',
  });

  const [isReadonly, setIsReadonly] = useState(false); // ⬅️ Zustand zum Sperren des Formulars
  // Hilfsfunktion: signed URL für bestehendes Bild erzeugen
  async function createSignedUrl(bucket, objectKey, ttlSeconds = 60 * 10) {
    if (!objectKey) return null;
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectKey, ttlSeconds);
    if (error) {
      console.error('Signed URL Fehler:', error);
      return null;
    }
    return data.signedUrl;
  }

  // Formular + zugehörige Dateien laden
 useEffect(() => {
    if (id && id !== 'new') {
      (async () => {
        const { data: formRow, error: formErr } = await supabase
          .from('forms')
          .select('*')
          .eq('id', id)
          .single();

        if (formErr) {
          console.error(formErr);
          return;
        }
        if (formRow) {
          setFormData(prev => ({ ...prev, ...formRow }));
          if (formRow.status === 'submitted') setIsReadonly(true);
        }

        // Dateien aus public.form_files laden
        const { data: filesData, error: filesErr } = await supabase
          .from('form_files') // table name
          .select('*')
          .eq('form_id', id);

        if (filesErr) {
          console.error('Fehler beim Laden der Dateien:', filesErr);
          return;
        }

        // Mappe die Ergebnisse auf die drei Typen
        const mapped = { calculations: null, drawings: null, other: null };
        if (filesData && filesData.length) {
          for (const f of filesData) {
            if (f.file_type === 'calculations') mapped.calculations = f;
            if (f.file_type === 'drawings') mapped.drawings = f;
            if (f.file_type === 'other') mapped.other = f;
          }
        }
        setStoredFiles(mapped);

        // Für jeden vorhandenen Eintrag eine signed URL erzeugen (wenn bucket/object_key vorhanden)
        const previews = { calculations: null, drawings: null, other: null };
        for (const key of ['calculations', 'drawings', 'other']) {
          const entry = mapped[key];
          if (entry && entry.object_key) {
            const url = await createSignedUrl(entry.bucket_id || 'form_files', entry.object_key);
            previews[key] = url;
          }
        }
        setFilePreviews(previews);
      })();
    }
  }, [id]);

// Datei-Auswahl Handler (für die 3 Inputs)
  function handleFileSelect(type, e) {
    const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setSelectedFiles(prev => ({ ...prev, [type]: f }));

    // lokale Vorschau (nur für Bilder)
    if (f && f.type.startsWith('image/')) {
      const localUrl = URL.createObjectURL(f);
      setFilePreviews(prev => ({ ...prev, [type]: localUrl }));
    } else {
      // wenn keine lokale Vorschaubild-Datei ist, entferne lokale Vorschau (gebe ggf. stored preview zurück)
      if (storedFiles[type]?.object_key) {
        createSignedUrl(storedFiles[type].bucket_id || 'form_files', storedFiles[type].object_key)
          .then(url => setFilePreviews(prev => ({ ...prev, [type]: url })))
          .catch(() => setFilePreviews(prev => ({ ...prev, [type]: null })));
      } else {
        setFilePreviews(prev => ({ ...prev, [type]: null }));
      }
    }
  }

  // Upload einer einzelnen Datei in form_files Bucket
async function uploadFileToBucket(type, fileToUpload, formId, userId) {
    if (!userId) {
      const { data: ud, error: ue } = await supabase.auth.getUser();
      if (ue || !ud?.user) throw new Error('Nicht eingeloggt');
      userId = ud.user.id;
    }

    const filePath = `${userId}/${formId || 'new'}/${Date.now()}-${type}-${fileToUpload.name}`;

    const { error: upErr } = await supabase
      .storage
      .from('form_files')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileToUpload.type,
      });

    if (upErr) throw upErr;
    return filePath;
  }

  // insertFileMetadata: uploaded_by wird als Parameter übergeben
async function insertFileMetadata({ formId, objectKey, fileType, fileName, contentType, size, uploaded_by }) {
  if (!uploaded_by) throw new Error('uploaded_by fehlt');
  const payload = {
    form_id: formId,
    object_key: objectKey,
    file_type: fileType,
    file_name: fileName,
    content_type: contentType,
    size: size,
    bucket_id: 'form_files',
    uploaded_by,
    metadata: null,
  };

  console.info('Inserting form_files payload', { payload });

  const { data, error } = await supabase.from('form_files').insert(payload).select();
  if (error) {
    console.error('INSERT form_files failed', { payload, error });
    throw error;
  }
  return data?.[0] ?? null;
}

// Speichern (Zwischenspeichern / Aktualisieren) — jetzt mit Multi-File-Uploads
  const handleSave = async () => {
    if (isReadonly) return;

    try {
    
    // hole user einmal oben in handleSave
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
        toast.error('Bitte einloggen.');
        return;
      }
      const userId = userRes.user.id;

    // Formular speichern/aktualisieren (damit wir eine form_id haben)
      const payload = {
        ...formData,
        user_id: userId,
        status: 'draft',
      };

      let formId = id;
      if (id === 'new') {
        const { data: insertData, error: insertErr } = await supabase.from('forms').insert(payload).select().single();
        if (insertErr) throw insertErr;
        formId = insertData.id;
        router.replace(`/form/${formId}`, undefined, { shallow: true });
        toast.success('Formular erfolgreich angelegt und zwischengespeichert.', { position: 'top-right' });
      } else {
        const { error: updateErr } = await supabase.from('forms').update(payload).eq('id', formId);
        if (updateErr) throw updateErr;
        toast.success('Änderungen wurden gespeichert.', { position: 'top-center' });
      }

    // Für jeden selektierten Dateityp: upload + metadata insert + update storedFiles + signed preview
    for (const type of ['calculations', 'drawings', 'other']) {
      const f = selectedFiles[type];
      if (f) {
        // upload (übergebe userId, damit uploadPath korrekt ist)
        const objectKey = await uploadFileToBucket(type, f, formId, userId);

        // Insert Metadaten: übergebe uploaded_by: userId
        const inserted = await insertFileMetadata({
          formId,
          objectKey,
          fileType: type,
          fileName: f.name,
          contentType: f.type,
          size: f.size,
          uploaded_by: userId,
        });

        if (!inserted) throw new Error('Metadaten konnten nicht gespeichert werden');

        // update local state
        const signed = await createSignedUrl('form_files', objectKey);
        setStoredFiles(prev => ({ ...prev, [type]: inserted }));
        setFilePreviews(prev => ({ ...prev, [type]: signed }));
        setSelectedFiles(prev => ({ ...prev, [type]: null }));
      }
    }
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

  // Download einzelner Dateien (öffnet signed URL in neuem Tab)
  const handleDownload = async (type) => {
    const entry = storedFiles[type];
    if (!entry || !entry.object_key) {
      toast.error('Datei nicht gefunden.');
      return;
    }
    const url = await createSignedUrl(entry.bucket_id || 'form_files', entry.object_key, 60);
    if (!url) {
      toast.error('Fehler beim Erstellen der Download-URL.');
      return;
    }
    window.open(url, '_blank');
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

          <p>Nutzungseinheiten: </p>

          <div className="spacebetween">
            <label htmlFor="bueroAnzNe">Bürogebäude - Anzahl Arbeitsplätze: </label>
            <input
              type='number'
              id="bueroAnzNe"
              step="1"
              min="0"
              placeholder=" - "
              value={formData.bueroAnzNe}
              onChange={e => setFormData({ ...formData, bueroAnzNe: e.target.value })}
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
            <legend><h2>6. Dateien (Flächen, Zeichnungen, Sonstiges)</h2></legend>

            <div>
              <label>Flächenberechnungen (PDF/Excel):</label>
              <input
                type="file"
                accept=".pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={(e) => handleFileSelect('calculations', e)}
                disabled={isReadonly}
              />
              {filePreviews.calculations ? (
                // wenn Bild -> Vorschau, sonst nur Dateiname / Download-Button
                (filePreviews.calculations.startsWith('blob:') || filePreviews.calculations.startsWith('data:')) ? (
                  <img src={filePreviews.calculations} alt="Vorschau" width={200} />
                ) : (
                  <div>
                    <p>{storedFiles.calculations?.file_name || selectedFiles.calculations?.name}</p>
                    {storedFiles.calculations && <button type="button" onClick={() => handleDownload('calculations')}>Download</button>}
                  </div>
                )
              ) : null}
            </div>

            <div>
              <label>Zeichnungen (DWG/PDF):</label>
              <input
                type="file"
                accept=".dwg,application/pdf"
                onChange={(e) => handleFileSelect('drawings', e)}
                disabled={isReadonly}
              />
              {filePreviews.drawings ? (
                (filePreviews.drawings.startsWith('blob:') || filePreviews.drawings.startsWith('data:')) ? (
                  <img src={filePreviews.drawings} alt="Vorschau" width={200} />
                ) : (
                  <div>
                    <p>{storedFiles.drawings?.file_name || selectedFiles.drawings?.name}</p>
                    {storedFiles.drawings && <button type="button" onClick={() => handleDownload('drawings')}>Download</button>}
                  </div>
                )
              ) : null}
            </div>

            <div>
              <label>Sonstiges (ZIP/Bilder):</label>
              <input
                type="file"
                accept=".zip,image/*"
                onChange={(e) => handleFileSelect('other', e)}
                disabled={isReadonly}
              />
              {filePreviews.other ? (
                (filePreviews.other.startsWith('blob:') || filePreviews.other.startsWith('data:')) ? (
                  <img src={filePreviews.other} alt="Vorschau" width={200} />
                ) : (
                  <div>
                    <p>{storedFiles.other?.file_name || selectedFiles.other?.name}</p>
                    {storedFiles.other && <button type="button" onClick={() => handleDownload('other')}>Download</button>}
                  </div>
                )
              ) : null}
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