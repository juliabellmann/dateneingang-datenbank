// pages/form/[id].js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import supabase from "../../lib/supabaseClient";
import styled from "styled-components";
// npm install react-toastify
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import InfoTooltip from "@/_components/InfoTooltip";

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
    status: "draft",

    objektbezeichnung: "",
    bauherr: "",

    street: "",
    housenumber: "",
    postalcode: "",
    city: "",
    landkreis: "",
    bundesland: "",

    planungsbeginn: "",
    vergabedatum: "",
    baubeginn: "",
    bauende: "",

    fotograf: "",
    
    NE_buero: "",
    NE_institut: "",
    NE_krankenhaus: "",
    NE_pflegeheim: "",
    NE_schule_schueler: "",
    NE_schule_klassen: "",
    NE_kindergarten_kinder: "",
    NE_kindergarten_gruppen: "",
    NE_wohngebaude: "",
    NE_heim: "",
    NE_versammlungsgebauede: "",
    NE_gaststaette: "",
    NE_hotel: "",
    NE_laborgebaeude: "",
    NE_produktionsstaette: "",
    NE_feuerwache: "",
    NE_parkhaus: "",
    NE_sonst_anz: "",

    UGs_anz: "",
    UGs_beschreibung: "",
    EGs_anz: "",
    EGs_beschreibung: "",
    OGs_anz: "",
    OGs_beschreibung: "",
    DGs_anz: "",
    DGs_beschreibung: "",
    
    allgemeine_objektinformation: "",
    baukonstruktion: "",
    technische_anlagen: "",
    beschreibung_sonstiges: "",
    region: "",
    konjunktur: "",
    standard: "",
    nuf: "",
    vf: "",
    tf: "",
    bgf: "",
    image_file_path: null,
    upload_one_path: null,
    upload_two_path: null,
    upload_three_path: null,
  });

  const [isReadonly, setIsReadonly] = useState(false); // ⬅️ Zustand zum Sperren des Formulars
  // Hilfsfunktion: signed URL für bestehendes Bild erzeugen
  async function refreshSignedUrl(key, filePath) {
    if (!filePath) {
      setPreviews((prev) => ({ ...prev, [key]: null }));
      return;
    }

    const { data, error } = await supabase.storage
      .from("form_files")
      .createSignedUrl(filePath, 60 * 10);

    if (error) {
      console.error("Signed URL Fehler:", error);
      setPreviews((prev) => ({ ...prev, [key]: null }));
      return;
    }

    setPreviews((prev) => ({ ...prev, [key]: data.signedUrl }));
  }

  // Formular laden
  useEffect(() => {
    if (id && id !== "new") {
      supabase
        .from("forms")
        .select("*")
        .eq("id", id)
        .single()
        .then(async ({ data, error }) => {
          if (error) {
            console.error(error);
            return;
          }
          if (data) {
            setFormData((prev) => ({ ...prev, ...data }));
            if (data.status === "submitted") setIsReadonly(true);
            if (data.image_file_path)
              await refreshSignedUrl("image", data.image_file_path);

            if (data.upload_one_path)
              await refreshSignedUrl("one", data.upload_one_path);

            if (data.upload_two_path)
              await refreshSignedUrl("two", data.upload_two_path);

            if (data.upload_three_path)
              await refreshSignedUrl("three", data.upload_three_path);
          }
        });
    }
  }, [id]);

  // Datei-Auswahl
  function handleFileChange(key, e) {
    const f = e.target.files?.[0] || null;

    setFiles((prev) => ({ ...prev, [key]: f }));

    if (!f) {
      setPreviews((prev) => ({ ...prev, [key]: null }));
      return;
    }

    if (f.type.startsWith("image/")) {
      const localUrl = URL.createObjectURL(f);
      setPreviews((prev) => ({ ...prev, [key]: localUrl }));
    } else {
      setPreviews((prev) => ({ ...prev, [key]: null }));
    }
  }

  // Upload ins private Bucket, Pfad = auth.uid()/timestamp-filename
  async function uploadFile(fileToUpload) {
    // Prüfe aktuellen User
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    console.log("uploadFile - auth.getUser result:", userData, userErr);
    if (userErr || !userData?.user) throw new Error("Nicht eingeloggt");
    const userId = userData.user.id;

    // Baue Dateipfad (wichtig für RLS-Policy wenn Pfad-Check verwendet wird)
    const filePath = `${userId}/${Date.now()}-${fileToUpload.name}`;
    console.log(
      "uploadFile - filePath:",
      filePath,
      "file type:",
      fileToUpload.type
    );

    const { data, error: upErr } = await supabase.storage
      .from("form_files")
      .upload(filePath, fileToUpload, {
        cacheControl: "3600",
        upsert: false,
        contentType: fileToUpload.type,
      });

    console.log("uploadFile - upload result:", { data, upErr });
    if (upErr) throw upErr;
    return filePath;
  }

  // Speichern (Zwischenspeichern / Aktualisieren)
  const handleSave = async () => {
    if (isReadonly) return;

    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) {
        toast.error("Bitte einloggen.");
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
        status: "draft",
        image_file_path,
        upload_one_path,
        upload_two_path,
        upload_three_path,
      };

      setFiles({ image: null, one: null, two: null, three: null });

      if (id === "new") {
        const { error: insertErr } = await supabase
          .from("forms")
          .insert(payload);
        if (insertErr) throw insertErr;
        toast.success("Formular erfolgreich zwischengespeichert!", {
          position: "top-right",
        });
      } else {
        const { error: updateErr } = await supabase
          .from("forms")
          .update(payload)
          .eq("id", id);
        if (updateErr) throw updateErr;
        toast.success("Änderungen wurden gespeichert.", {
          position: "top-center",
        });
      }
      setFormData((prev) => ({
        ...prev,
        image_file_path,
        upload_one_path,
        upload_two_path,
        upload_three_path,
      }));

      if (image_file_path) await refreshSignedUrl("image", image_file_path);

      if (upload_one_path) await refreshSignedUrl("one", upload_one_path);

      if (upload_two_path) await refreshSignedUrl("two", upload_two_path);

      if (upload_three_path) await refreshSignedUrl("three", upload_three_path);
    } catch (error) {
      console.error("handleSave error:", error);
      toast.error(
        `Beim Speichern ist ein Fehler aufgetreten: ${error?.message || error}`
      );
    }
  };

  // Absenden (final)
  const handleSubmit = async () => {
    if (isReadonly) return;
    const { error } = await supabase
      .from("forms")
      .update({ ...formData, status: "submitted" })
      .eq("id", id);
    if (error) {
      console.error(error);
      toast.error("Fehler beim Absenden.");
      return;
    }
    router.push("/dashboard");
  };

  // PDF Download
  const downloadPdf = () => {
    window.open(`/api/downloadPdf?id=${id}`, "_blank");
  };

  const handleDownloadFile = async (filePath) => {
    if (!filePath) {
      toast.error("Keine Datei vorhanden.");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("form_files")
        .createSignedUrl(filePath, 60 * 10);

      if (error) throw error;

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = filePath.split("/").pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      toast.error("Download fehlgeschlagen.");
    }
  };

  const getDisplayFileName = (path) => {
    if (!path) return "";

    const fileName = path.split("/").pop();

    // entfernt führende Zahlen + _ oder -
    return fileName.replace(/^\d+[_-]/, "");
  };

  return (
    <>
      <StyledSite>
        <h1>Formular</h1>

        {/* Hinweis bei gesperrtem Formular */}
        {isReadonly && (
          <p
            style={{
              backgroundColor: "#eee",
              padding: "1rem",
              marginBottom: "1rem",
            }}
          >
            Dieses Formular wurde bereits eingereicht und ist nicht mehr
            bearbeitbar.
          </p>
        )}

        <form>
          <StyledFieldset>
            <legend>
              <h2>1. Allgemeine Angaben</h2>
            </legend>

            <div className="spacebetween">
              <label htmlFor="objektbezeichnung">
                Objektbezeichnung / Art der Nutzung:{" "}
              </label>
              <input
                id="objektbezeichnung"
                placeholder="Objektbezeichnung"
                value={formData.objektbezeichnung}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    objektbezeichnung: e.target.value,
                  })
                }
                readOnly={isReadonly}
              />
            </div>

            <div className="spacebetween">
              <label htmlFor="bauherr">Bauherr: </label>
              <input
                id="bauherr"
                placeholder="Bauherr"
                value={formData.bauherr}
                onChange={(e) =>
                  setFormData({ ...formData, bauherr: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>

            <p>Objektstandort: </p>

            <div className="spacebetween">
              <label htmlFor="street">Straße: </label>
              <input
                id="street"
                placeholder="Straße"
                value={formData.street}
                onChange={(e) =>
                  setFormData({ ...formData, street: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>

            <div className="spacebetween">
              <label htmlFor="housenumber">Hausnummer: </label>
              <input
                id="housenumber"
                placeholder="Hausnummer"
                value={formData.housenumber}
                onChange={(e) =>
                  setFormData({ ...formData, housenumber: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>

            <div className="spacebetween">
              <label htmlFor="postalcode">Postleitzahlt: </label>
              <input
                id="postalcode"
                placeholder="PLZ"
                value={formData.postalcode}
                onChange={(e) =>
                  setFormData({ ...formData, postalcode: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>

            <div className="spacebetween">
              <label htmlFor="city">Stadt: </label>
              <input
                id="city"
                placeholder="Stadt"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>

            <div className="spacebetween">
              <label htmlFor="landkreis">Landkreis: </label>
              <input
                id="landkreis"
                placeholder="Landkreis"
                value={formData.landkreis}
                onChange={(e) =>
                  setFormData({ ...formData, landkreis: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>

            <div className="spacebetween">
              <label htmlFor="bundesland">Bundesland: </label>
              <input
                id="bundesland"
                placeholder="Bundesland"
                value={formData.bundesland}
                onChange={(e) =>
                  setFormData({ ...formData, bundesland: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, planungsbeginn: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="vergabedatum">Haupt-/Rohbauvergabe: </label>
              <input
                type="date"
                id="vergabedatum"
                value={formData.vergabedatum}
                onChange={(e) =>
                  setFormData({ ...formData, vergabedatum: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="baubeginn">Baubeginn: </label>
              <input
                type="date"
                id="baubeginn"
                value={formData.baubeginn}
                onChange={(e) =>
                  setFormData({ ...formData, baubeginn: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="bauende">Bauende: </label>
              <input
                type="date"
                id="bauende"
                value={formData.bauende}
                onChange={(e) =>
                  setFormData({ ...formData, bauende: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>
            <p>* Hinweis: wenn der genaue Tag der Vergabe nicht bekannt ist, geben Sie bitte den 1. Tag des jeweiligen Monats an.</p>
            <p> Copyrights für die Fotos: </p>
            <div className="spacebetween">
              <label htmlFor="fotograf">Copyright liegt bei: </label>
              <input
                id="fotograf"
                placeholder="Architekt oder Name des prof. Fotograf"
                value={formData.fotograf}
                onChange={(e) =>
                  setFormData({ ...formData, fotograf: e.target.value })
                }
                readOnly={isReadonly}
              />
            </div>

            <h3>Nutzeinheiten</h3>
            <div className="spacebetween">
              <label htmlFor="NE_buero">Bürogebäude - Anzahl Arbeitsplätze: </label>
              <input
                type="number"
                id="NE_buero"
                step="1"
                min="0"
                value={formData.NE_buero}
                onChange={(e) =>
                  setFormData({ ...formData, NE_buero: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_institut">Institutsgebäude - Anzahl Arbeitsplätze: </label>
              <input
                type="number"
                id="NE_institut"
                step="1"
                min="0"
                value={formData.NE_institut}
                onChange={(e) =>
                  setFormData({ ...formData, NE_institut: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_krankenhaus">Krankenhaus - Anzahl Betten: </label>
              <input
                type="number"
                id="NE_krankenhaus"
                step="1"
                min="0"
                value={formData.NE_krankenhaus}
                onChange={(e) =>
                  setFormData({ ...formData, NE_krankenhaus: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_pflegeheim">Pflegeheim - Anzahl Betten: </label>
              <input
                type="number"
                id="NE_pflegeheim"
                step="1"
                min="0"
                value={formData.NE_pflegeheim}
                onChange={(e) =>
                  setFormData({ ...formData, NE_pflegeheim: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_schule_schueler">Schule - Anzahl Schüler: </label>
              <input
                type="number"
                id="NE_schule_schueler"
                step="1"
                min="0"
                value={formData.NE_schule_schueler}
                onChange={(e) =>
                  setFormData({ ...formData, NE_schule_schueler: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_schule_klassen">Schule - Anzahl Klassen: </label>
              <input
                type="number"
                id="NE_schule_klassen"
                step="1"
                min="0"
                value={formData.NE_schule_klassen}
                onChange={(e) =>
                  setFormData({ ...formData, NE_schule_klassen: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_kindergarten_kinder">Kindergarten - Anzahl Kinder: </label>
              <input
                type="number"
                id="NE_kindergarten_kinder"
                step="1"
                min="0"
                value={formData.NE_kindergarten_kinder}
                onChange={(e) =>
                  setFormData({ ...formData, NE_kindergarten_kinder: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_kindergarten_gruppen">Kindergarten - Anzahl Gruppen: </label>
              <input
                type="number"
                id="NE_kindergarten_gruppen"
                step="1"
                min="0"
                value={formData.NE_kindergarten_gruppen}
                onChange={(e) =>
                  setFormData({ ...formData, NE_kindergarten_gruppen: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_wohngebaude">Wohngebäude - Anzahl Wohneinheiten: </label>
              <input
                type="number"
                id="NE_wohngebaude"
                step="1"
                min="0"
                value={formData.NE_wohngebaude}
                onChange={(e) =>
                  setFormData({ ...formData, NE_wohngebaude: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_heim">Heim - Anzahl Betten: </label>
              <input
                type="number"
                id="NE_heim"
                step="1"
                min="0"
                value={formData.NE_heim}
                onChange={(e) =>
                  setFormData({ ...formData, NE_heim: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_versammlungsgebauede">Versammlungsgebäude - Anzahl Sitzplätze: </label>
              <input
                type="number"
                id="NE_versammlungsgebauede"
                step="1"
                min="0"
                value={formData.NE_versammlungsgebauede}
                onChange={(e) =>
                  setFormData({ ...formData, NE_versammlungsgebauede: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_gaststaette">Gaststätte - Anzahl Sitzplätze: </label>
              <input
                type="number"
                id="NE_gaststaette"
                step="1"
                min="0"
                value={formData.NE_gaststaette}
                onChange={(e) =>
                  setFormData({ ...formData, NE_gaststaette: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_hotel">Gaststätte - Anzahl Betten: </label>
              <input
                type="number"
                id="NE_hotel"
                step="1"
                min="0"
                value={formData.NE_hotel}
                onChange={(e) =>
                  setFormData({ ...formData, NE_hotel: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_laborgebaeude">Laborgebäude - Anzahl Arbeitsplätze: </label>
              <input
                type="number"
                id="NE_laborgebaeude"
                step="1"
                min="0"
                value={formData.NE_laborgebaeude}
                onChange={(e) =>
                  setFormData({ ...formData, NE_laborgebaeude: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_produktionsstaette">Produktionsstätte - Anzahl Arbeitsplätze: </label>
              <input
                type="number"
                id="NE_produktionsstaette"
                step="1"
                min="0"
                value={formData.NE_produktionsstaette}
                onChange={(e) =>
                  setFormData({ ...formData, NE_produktionsstaette: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_feuerwache">Feuerwache - Anzahl Fahrzeugplätze: </label>
              <input
                type="number"
                id="NE_feuerwache"
                step="1"
                min="0"
                value={formData.NE_feuerwache}
                onChange={(e) =>
                  setFormData({ ...formData, NE_feuerwache: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_parkhaus">Parkhaus / Garage - Anzahl Stellplätze: </label>
              <input
                type="number"
                id="NE_parkhaus"
                step="1"
                min="0"
                value={formData.NE_parkhaus}
                onChange={(e) =>
                  setFormData({ ...formData, NE_parkhaus: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="NE_sonst_anz">Sonstiges - Anzahl Nutzeinheit: </label>
              {/* Inputs für Sonstiges etc ergänzen */}
              <input
                type="number"
                id="NE_sonst_anz"
                step="1"
                min="0"
                value={formData.NE_sonst_anz}
                onChange={(e) =>
                  setFormData({ ...formData, NE_sonst_anz: e.target.value })
                }
              />
            </div>
          </StyledFieldset>

          <StyledButton
            type="button"
            onClick={handleSave}
            disabled={isReadonly}
          >
            Zwischenspeichern
          </StyledButton>

          <StyledFieldset>
            <legend>
              <h2>2. Objektbeschreibung</h2>
            </legend>

            <div className="spacebetween">
              <label htmlFor="UGs_anz">Anzahl der UG(s): </label>
              {/* Inputs für Sonstiges etc ergänzen */}
              <input
                type="number"
                id="UGs_anz"
                step="1"
                min="0"
                value={formData.UGs_anz}
                onChange={(e) =>
                  setFormData({ ...formData, UGs_anz: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="UGs_beschreibung">
                Beschreibung der UG(s):
              </label>
              <textarea
                id="UGs_beschreibung"
                placeholder="Beschreibe die Untergeschosse hier..."
                value={formData.UGs_beschreibung}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    UGs_beschreibung: e.target.value,
                  })
                }
                readOnly={isReadonly}
                rows={5}
              />
            </div>

            <div className="spacebetween">
              <label htmlFor="EGs_anz">Anzahl der EG(s): </label>
              {/* Inputs für Sonstiges etc ergänzen */}
              <input
                type="number"
                id="EGs_anz"
                step="1"
                min="0"
                value={formData.EGs_anz}
                onChange={(e) =>
                  setFormData({ ...formData, EGs_anz: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="EGs_beschreibung">
                Beschreibung der EG(s):
              </label>
              <textarea
                id="EGs_beschreibung"
                placeholder="Beschreibe die Untergeschosse hier..."
                value={formData.EGs_beschreibung}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    EGs_beschreibung: e.target.value,
                  })
                }
                readOnly={isReadonly}
                rows={5}
              />
            </div>

            <div className="spacebetween">
              <label htmlFor="OGs_anz">Anzahl der OG(s): </label>
              {/* Inputs für Sonstiges etc ergänzen */}
              <input
                type="number"
                id="OGs_anz"
                step="1"
                min="0"
                value={formData.OGs_anz}
                onChange={(e) =>
                  setFormData({ ...formData, OGs_anz: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="OGs_beschreibung">
                Beschreibung der OG(s):
              </label>
              <textarea
                id="OGs_beschreibung"
                placeholder="Beschreibe die Untergeschosse hier..."
                value={formData.OGs_beschreibung}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    OGs_beschreibung: e.target.value,
                  })
                }
                readOnly={isReadonly}
                rows={5}
              />
            </div>

            <div className="spacebetween">
              <label htmlFor="DGs_anz">Anzahl der DG(s): </label>
              {/* Inputs für Sonstiges etc ergänzen */}
              <input
                type="number"
                id="DGs_anz"
                step="1"
                min="0"
                value={formData.DGs_anz}
                onChange={(e) =>
                  setFormData({ ...formData, DGs_anz: e.target.value })
                }
              />
            </div>
            <div className="spacebetween">
              <label htmlFor="DGs_beschreibung">
                Beschreibung der DG(s):
              </label>
              <textarea
                id="DGs_beschreibung"
                placeholder="Beschreibe die Untergeschosse hier..."
                value={formData.DGs_beschreibung}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    DGs_beschreibung: e.target.value,
                  })
                }
                readOnly={isReadonly}
                rows={5}
              />
            </div>

            <div className="spacebetween-info">
              <label htmlFor="allgemeine_objektinformation">
                Allgemeine Objektinformation:
              </label>
              <StyledFieldTooltip>
              <textarea
                id="allgemeine_objektinformation"
                placeholder="Beschreibe das Objekt hier..."
                value={formData.allgemeine_objektinformation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    allgemeine_objektinformation: e.target.value,
                  })
                }
                readOnly={isReadonly}
                rows={5}
                />
              <InfoTooltip text="zusätzliche Objektinformationen. - Beispieltext: Die Bauherren hatten sich Referenzobjekte des Architekturbüros angesehen. Sie realisierten die Reihenhäuser in Passivhausbauweise als Bauträger und verkauften sie nach ihrer Fertigstellung." />
                </StyledFieldTooltip>
            </div>

            <div className="spacebetween-info">
              <label htmlFor="baukonstruktion">Baukonstruktion:</label>
              <StyledFieldTooltip>
              <textarea
                id="baukonstruktion"
                placeholder="Beschreibe das Objekt hier..."
                value={formData.baukonstruktion}
                onChange={(e) =>
                  setFormData({ ...formData, baukonstruktion: e.target.value })
                }
                readOnly={isReadonly}
                rows={5}
                />
              <InfoTooltip text="zusätzliche Informationen zur Baukonstruktion als Ergänzung zur Beschreibung der Kosten nach DIN 276. - Beispieltext: Es wurde die Holzbauweise gewählt. Da bei ihr Dämm- und Konstruktionsebene zusammenfallen, sind die Außenwände schlanker und somit wirtschaftlicher als beim Massivbau. Die Holztafeln mit thermisch entkoppelten Holzprofilen wurden vorproduziert. Durch die hohe Planungs- und Ausführungsgenauigkeit konnten parallel zu den Tafeln bspw. die Fenster gefertigt werden. Dadurch dauerte die Bauzeit für alle Häuser zehn Monate." />
                </StyledFieldTooltip>
            </div>

            <div className="spacebetween-info">
              <label htmlFor="technische_anlagen">Technische Anlagen: </label>
              <StyledFieldTooltip>

              <textarea
                id="technische_anlagen"
                placeholder="Beschreibe das Objekt hier..."
                value={formData.technische_anlagen}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    technische_anlagen: e.target.value,
                  })
                }
                readOnly={isReadonly}
                rows={5}
                />
              <InfoTooltip text="zusätzliche Informationen zur Baukonstruktion als Ergänzung zur Beschreibung der Kosten nach DIN 276. - Beispieltext: Zwar wurden Varianten für die Energieversorgung berechnet, dennoch musste das Passivhaus an Fernwärme angeschlossen werden. Sie wird an einen gemeinsamen Speicher übergeben, an den auch Flachkollektoren angeschlossen sind. Um eine Nachrüstung von Photovoltaikelementen zu vereinfachen, wurden Leerrohre verlegt. Jede Wohnung erhielt eine Zu- und Abluftanlage mit Wärmerückgewinnung. Die Luftdichtheit der Gebäude wurde mit einem Blower-Door-Test geprüft. Die passivhaustauglichen Holz-Aluminium-Fenster mit Dreifachverglasung sind zudem hoch schalldämmend." />
                </StyledFieldTooltip>
            </div>

            <div className="spacebetween-info">
              <label htmlFor="beschreibung_sonstiges">Sonstiges: </label>
              <StyledFieldTooltip>

              <textarea
                id="beschreibung_sonstiges"
                placeholder="Beschreibe das Objekt hier..."
                value={formData.beschreibung_sonstiges}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    beschreibung_sonstiges: e.target.value,
                  })
                }
                readOnly={isReadonly}
                rows={5}
                />
              <InfoTooltip text="zusätzliche interessante Informationen zum Objekt - Beispieltext: Der kompakte Baukörper hat eine weinrote Holzfassade und ein hellgraues Staffelgeschoss. Auf der Nordseite wurden neben den Fenstern rückseitig lackierte Gläser eingesetzt. Sie lassen die Fensterformate breiter erscheinen, während innen flexibel möbliert werden kann. Die Holzinnendecken wurden weiß lasiert. Als weiteres Gestaltungselement wurden in den Treppenaugen Regale eingebaut. Den Vorbereich prägen optisch abgetrennte Carports und ein Holzsteg unter einem Glasvordach. Der Bereich hinter dem Haus wurde mit Erde angefüllt und erhielt eine Gartenanlage mit einer Trockenmauer." />
                </StyledFieldTooltip>
            </div>

          </StyledFieldset>

          <StyledButton
            type="button"
            onClick={handleSave}
            disabled={isReadonly}
          >
            Zwischenspeichern
          </StyledButton>

          <StyledFieldset>
            <legend>
              <h2>3. Kosteneinflüsse</h2>
            </legend>

            <h3>Region</h3>
            <p>Die Zuordnung sinngemäß vornehmen, z. B. Großstadt auch dann ankreuzen, wenn der Standort des Objekts zwar eine nichtstädtische Gemeinde (Land) ist, die aber im Hinblick auf die Angebotssituation für Bauleistungen im Einzugsgebiet einer Großstadt liegt.</p>
            <StyledRadiobuttons>
              <label>
                <input
                  type="radio"
                  name="region"
                  value="land"
                  checked={formData.region === "land"}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                  disabled={isReadonly}
                />{" "}
                ländlich
              </label>
              <label>
                <input
                  type="radio"
                  name="region"
                  value="stadt"
                  checked={formData.region === "stadt"}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                  disabled={isReadonly}
                />{" "}
                Stadt
              </label>
              <label>
                <input
                  type="radio"
                  name="region"
                  value="großstadt"
                  checked={formData.region === "großstadt"}
                  onChange={(e) =>
                    setFormData({ ...formData, region: e.target.value })
                  }
                  disabled={isReadonly}
                />{" "}
                Großstadt
              </label>
            </StyledRadiobuttons>

            <h3>Konjunktur</h3>
            <p>Ihre Einschätzung zum Zeitpunkt der Hauptvergaben: schwach = Rezessionsphase, sehr günstige Angebote; mittel = durchschnittliche Angebotssituation; hoch = Hochkonjunktur, große Baunachfrage, relativ hohe Angebotspreise.</p>
            <StyledRadiobuttons>
              <label>
                <input
                  type="radio"
                  name="konjunktur"
                  value="schwach"
                  checked={formData.konjunktur === "schwach"}
                  onChange={(e) =>
                    setFormData({ ...formData, konjunktur: e.target.value })
                  }
                  disabled={isReadonly}
                />{" "}
                schwach
              </label>
              <label>
                <input
                  type="radio"
                  name="konjunktur"
                  value="mittel"
                  checked={formData.konjunktur === "mittel"}
                  onChange={(e) =>
                    setFormData({ ...formData, konjunktur: e.target.value })
                  }
                  disabled={isReadonly}
                />{" "}
                mittel
              </label>
              <label>
                <input
                  type="radio"
                  name="konjunktur"
                  value="hoch"
                  checked={formData.konjunktur === "hoch"}
                  onChange={(e) =>
                    setFormData({ ...formData, konjunktur: e.target.value })
                  }
                  disabled={isReadonly}
                />{" "}
                hoch
              </label>
            </StyledRadiobuttons>

            <h3>Standard</h3>
            <StyledRadiobuttons>
              <label>
                <input
                  type="radio"
                  name="standard"
                  value="schwach"
                  checked={formData.standard === "schwach"}
                  onChange={(e) =>
                    setFormData({ ...formData, standard: e.target.value })
                  }
                  disabled={isReadonly}
                />{" "}
                schwach
              </label>
              <label>
                <input
                  type="radio"
                  name="standard"
                  value="mittel"
                  checked={formData.standard === "mittel"}
                  onChange={(e) =>
                    setFormData({ ...formData, standard: e.target.value })
                  }
                  disabled={isReadonly}
                />{" "}
                mittel
              </label>
              <label>
                <input
                  type="radio"
                  name="standard"
                  value="hoch"
                  checked={formData.standard === "hoch"}
                  onChange={(e) =>
                    setFormData({ ...formData, standard: e.target.value })
                  }
                  disabled={isReadonly}
                />{" "}
                hoch
              </label>
            </StyledRadiobuttons>
          </StyledFieldset>

          <StyledButton
            type="button"
            onClick={handleSave}
            disabled={isReadonly}
          >
            Zwischenspeichern
          </StyledButton>

          <StyledFieldset>
            <legend>
              <h2>4. Flächen und Rauminhalte nach DIN 277:2021-08</h2>
            </legend>
            <div>
              <label htmlFor="nuf">Nutzungsflächen: </label>
              <input
                type="number"
                id="nuf"
                step="0.01"
                min="0"
                value={formData.nuf}
                onChange={(e) =>
                  setFormData({ ...formData, nuf: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="tf">Technikfläche: </label>
              <input
                type="number"
                id="tf"
                step="0.01"
                min="0"
                value={formData.tf}
                onChange={(e) =>
                  setFormData({ ...formData, tf: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="vf">Verkehrsfläche: </label>
              <input
                type="number"
                id="vf"
                step="0.01"
                min="0"
                value={formData.vf}
                onChange={(e) =>
                  setFormData({ ...formData, vf: e.target.value })
                }
              />
            </div>
            <div>
              <label htmlFor="bgf">Brutto-Grundfläche: </label>
              <input
                type="number"
                id="bgf"
                step="0.01"
                min="0"
                value={formData.bgf}
                onChange={(e) =>
                  setFormData({ ...formData, bgf: e.target.value })
                }
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
                  .replace(".", ",")}
              </span>
              <span> m²</span>
            </div>
          </StyledFieldset>

          <StyledButton
            type="button"
            onClick={handleSave}
            disabled={isReadonly}
          >
            Zwischenspeichern
          </StyledButton>

          <StyledFieldset>
            <legend>
              <h2>5. Kosten nach DIN 276:2018-12</h2>
            </legend>
          </StyledFieldset>

          <StyledButton
            type="button"
            onClick={handleSave}
            disabled={isReadonly}
          >
            Zwischenspeichern
          </StyledButton>

          <StyledFieldset>
            <legend>
              <h2>6. weitere Projektangaben</h2>
            </legend>

            {["image", "one", "two", "three"].map((key) => {
              const filePath =
                formData[`${key}_file_path`] || formData[`upload_${key}_path`];
              const labelMap = {
                image: "Upload Hauptdatei",
                one: "Upload eins",
                two: "Upload zwei",
                three: "Upload drei",
              };

              return (
                <div key={key} style={{ marginBottom: "1rem" }}>
                  <label>{labelMap[key]}:</label>

                  {/* verstecktes File-Input */}
                  <input
                    type="file"
                    id={`file-${key}`}
                    style={{ display: "none" }}
                    onChange={(e) => handleFileChange(key, e)}
                    disabled={isReadonly}
                  />

                  {/* eigener Button */}
                  <StyledButton
                    type="button"
                    onClick={() =>
                      document.getElementById(`file-${key}`).click()
                    }
                    disabled={isReadonly}
                  >
                    Datei auswählen
                  </StyledButton>

                  {/* Anzeige gewählter Datei oder bestehender Pfad */}
                  <span style={{ marginLeft: "1rem" }}>
                    {files[key]?.name ||
                      (filePath
                        ? getDisplayFileName(filePath)
                        : "Keine Datei ausgewählt")}
                    {filePath && (
                      <small style={{ marginLeft: "0.5rem", color: "#666" }}>
                        ({filePath.split(".").pop().toUpperCase()})
                      </small>
                    )}
                  </span>

                  {/* Vorschau bei Bilddateien */}
                  {previews[key] && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <img src={previews[key]} alt="Vorschau" width={200} />
                    </div>
                  )}

                  {/* Download-Button nur bei readonly */}
                  {isReadonly && filePath && (
                    <StyledButton
                      type="button"
                      onClick={() => handleDownloadFile(filePath)}
                      style={{ marginTop: "0.5rem" }}
                    >
                      Datei herunterladen
                    </StyledButton>
                  )}
                </div>
              );
            })}
          </StyledFieldset>

          {/* Buttons deaktivieren, wenn readonly */}
          <StyledButton
            type="button"
            onClick={handleSave}
            disabled={isReadonly}
          >
            Zwischenspeichern
          </StyledButton>
          <StyledButton type="button" onClick={() => router.push("/dashboard")}>
            Zurück zur Übersicht
          </StyledButton>
          <StyledButton
            type="button"
            onClick={handleSubmit}
            disabled={isReadonly}
          >
            Absenden
          </StyledButton>
        </form>

        {/* ⬇️ Zurück-Button nur im readonly-Modus */}
        {isReadonly && (
          <>
            <StyledBackButton
              type="button"
              onClick={() => router.push("/dashboard")}
            >
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
  justify-content: center;
  gap: 1.5rem;

  label {
  // background-color: red;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 150px;
  }
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

const StyledFieldTooltip = styled.div`
min-width: 400px;

display: flex;
`;