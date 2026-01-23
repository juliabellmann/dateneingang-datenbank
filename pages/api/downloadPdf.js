// pages/api/downloadPdf.js
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // ⚠️ Diese muss im .env stehen, niemals im Browser verwenden!
);

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Formular-ID fehlt" });
  }

  // Formular aus DB laden
  const { data: form, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !form) {
    return res.status(404).json({ error: "Formular nicht gefunden" });
  }

  // PDF generieren
  const doc = new PDFDocument();

  // Headers setzen, um Download zu triggern
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=formular_${id}.pdf`,
  );

  doc.pipe(res);

  // Hilfe für das formatieren

  // doc.moveDown(); -> Leerzeile einfügen
  // doc.font('Helvetica-Bold').text('Fettschrift');
  // doc.font('Helvetica-Oblique').text('Kursiv');
  // doc.font('Helvetica').text('Unterstrichen', { underline: true });
  // doc.font('fonts/OpenSans-Bold.ttf').text('Eigene Schriftart');

  // doc.text('Zentriert', { align: 'center' });
  // doc.text('Rechtsbündig', { align: 'right' });
  // doc.text('Blocksatz', { align: 'justify' });

  // doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke(); // horizontale Linie

  // ---------------------------------------------------------
  // TITEL
  // ---------------------------------------------------------
  doc.fontSize(20).text("Formular", { underline: true });
  doc.moveDown();

  // ---------------------------------------------------------
  // BASISDATEN
  // ---------------------------------------------------------
  doc.fontSize(14).text(`Objektbezeichnung: ${form.objektbezeichnung || "-"}`);
  doc.text(`Bauherr: ${form.bauherr || "-"}`);
  doc.text(`Straße: ${form.street || "-"}`);
  doc.text(`Hausnummer: ${form.housenumber || "-"}`);
  doc.text(`PLZ: ${form.postalcode || "-"}`);
  doc.text(`Stadt: ${form.city || "-"}`);
  doc.text(`Landkreis: ${form.landkreis || "-"}`);
  doc.text(`Bundesland: ${form.bundesland || "-"}`);
  doc.moveDown();

  // ---------------------------------------------------------
  // ZEITEN
  // ---------------------------------------------------------
  doc.fontSize(20).text("Projektzeiten", { underline: true });
  doc.moveDown();

  doc.fontSize(14).text(`Planungsbeginn: ${form.planungsbeginn || "-"}`);
  doc.text(`Vergabedatum: ${form.vergabedatum || "-"}`);
  doc.text(`Baubeginn: ${form.baubeginn || "-"}`);
  doc.text(`Bauende: ${form.bauende || "-"}`);
  doc.text(`Fotograf: ${form.fotograf || "-"}`);
  doc.moveDown();

  // ---------------------------------------------------------
  // NUTZUNGSEINHEITEN
  // ---------------------------------------------------------
  doc.fontSize(20).text("Nutzungseinheiten", { underline: true });
  doc.moveDown();

  doc.fontSize(14).text(`Büro: ${form.NE_buero || "-"}`);
  doc.text(`Institut: ${form.NE_institut || "-"}`);
  doc.text(`Krankenhaus: ${form.NE_krankenhaus || "-"}`);
  doc.text(`Pflegeheim: ${form.NE_pflegeheim || "-"}`);
  doc.text(`Schule (Schüler): ${form.NE_schule_schueler || "-"}`);
  doc.text(`Schule (Klassen): ${form.NE_schule_klassen || "-"}`);
  doc.text(`Kindergarten (Kinder): ${form.NE_kindergarten_kinder || "-"}`);
  doc.text(`Kindergarten (Gruppen): ${form.NE_kindergarten_gruppen || "-"}`);
  doc.text(`Wohngebäude: ${form.NE_wohngebaude || "-"}`);
  doc.text(`Heim: ${form.NE_heim || "-"}`);
  doc.text(`Versammlungsgebäude: ${form.NE_versammlungsgebauede || "-"}`);
  doc.text(`Gaststätte: ${form.NE_gaststaette || "-"}`);
  doc.text(`Hotel: ${form.NE_hotel || "-"}`);
  doc.text(`Laborgebäude: ${form.NE_laborgebaeude || "-"}`);
  doc.text(`Produktionsstätte: ${form.NE_produktionsstaette || "-"}`);
  doc.text(`Feuerwache: ${form.NE_feuerwache || "-"}`);
  doc.text(`Parkhaus: ${form.NE_parkhaus || "-"}`);
  doc.text(`Sonstige Anzahl: ${form.NE_sonst_anz || "-"}`);
  doc.moveDown();

  // ---------------------------------------------------------
  // GESCHOSSE
  // ---------------------------------------------------------
  doc.fontSize(20).text("Geschosse", { underline: true });
  doc.moveDown();

  doc.fontSize(14).text(`UG Anzahl: ${form.UGs_anz || "-"}`);
  doc.text(`UG Beschreibung: ${form.UGs_beschreibung || "-"}`);
  doc.text(`EG Anzahl: ${form.EGs_anz || "-"}`);
  doc.text(`EG Beschreibung: ${form.EGs_beschreibung || "-"}`);
  doc.text(`OG Anzahl: ${form.OGs_anz || "-"}`);
  doc.text(`OG Beschreibung: ${form.OGs_beschreibung || "-"}`);
  doc.text(`DG Anzahl: ${form.DGs_anz || "-"}`);
  doc.text(`DG Beschreibung: ${form.DGs_beschreibung || "-"}`);
  doc.moveDown();

  // ---------------------------------------------------------
  // OBJEKTINFORMATIONEN
  // ---------------------------------------------------------
  doc.fontSize(20).text("Objektinformationen", { underline: true });
  doc.moveDown();

  doc
    .fontSize(14)
    .text(
      `Allgemeine Objektinformation: ${form.allgemeine_objektinformation || "-"}`,
    );
  doc.moveDown();
  doc.text(`Baukonstruktion: ${form.baukonstruktion || "-"}`);
  doc.moveDown();
  doc.text(`Technische Anlagen: ${form.technische_anlagen || "-"}`);
  doc.moveDown();
  doc.text(`Beschreibung Sonstiges: ${form.beschreibung_sonstiges || "-"}`);
  doc.moveDown();
  doc.text(`Region: ${form.region || "-"}`);
  doc.text(`Konjunktur: ${form.konjunktur || "-"}`);
  doc.text(`Standard: ${form.standard || "-"}`);
  doc.moveDown();

  // ---------------------------------------------------------
  // FLÄCHEN
  // ---------------------------------------------------------
  doc.fontSize(20).text("Flächen", { underline: true });
  doc.moveDown();

  doc.fontSize(14).text(`NUF: ${form.nuf || "-"}`);
  doc.text(`VF: ${form.vf || "-"}`);
  doc.text(`TF: ${form.tf || "-"}`);
  doc.text(`BGF: ${form.bgf || "-"}`);
  doc.moveDown();

  // ---------------------------------------------------------
  // DATEIPFAD-HINWEISE
  // ---------------------------------------------------------
  doc.fontSize(20).text("Dateipfade", { underline: true });
  doc.moveDown();

  doc.fontSize(14).text(`Bilddatei: ${form.image_file_path || "-"}`);
  doc.text(`Upload 1: ${form.upload_one_path || "-"}`);
  doc.text(`Upload 2: ${form.upload_two_path || "-"}`);
  doc.text(`Upload 3: ${form.upload_three_path || "-"}`);

  doc.end();
}
