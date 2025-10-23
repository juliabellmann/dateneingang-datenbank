// pages/api/downloadPdf.js
import PDFDocument from 'pdfkit';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL,
process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ Diese muss im .env stehen, niemals im Browser verwenden!
);


export default async function handler(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Formular-ID fehlt' });
  }

  // Formular aus DB laden
  const { data: form, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !form) {
    return res.status(404).json({ error: 'Formular nicht gefunden' });
  }

  // PDF generieren
  const doc = new PDFDocument();

  // Headers setzen, um Download zu triggern
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=formular_${id}.pdf`);

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


  // PDF Inhalt
  doc.fontSize(20).text('Formular', { underline: true });
  doc.moveDown();

  doc.fontSize(14).text(`Stadt: ${form.city || '-'}`);
  // doc.text(`Größe: ${Array.isArray(form.size) ? form.size.join(', ') : '-'}`);
  doc.text(`Objektbezeichnung: ${form.objektbezeichnung || '-'}`);
  doc.moveDown(); 

  doc.fontSize(20).text('Überschrift', { underline: true });
  doc.fontSize(14).moveDown(); 

  doc.text(`Planungsbeginn: ${form.planungsbeginn || '-'}`);
  doc.text(`Vergabedatum: ${form.vergabedatum || '-'}`);
  doc.text(`Baubeginn: ${form.baubeginn || '-'}`);
  doc.text(`Bauende: ${form.bauende || '-'}`);
  doc.moveDown();
  doc.text(`Allgemeine Objektinformation: ${form.allgemeine_objektinformation || '-'}`);
  doc.text(`Baukonstruktion: ${form.baukonstruktion || '-'}`);
  doc.text(`Technische Anlagen: ${form.technische_anlagen || '-'}`);
  doc.text(`Beschreibung Sonstiges: ${form.beschreibung_sonstiges || '-'}`);
  doc.text(`NUF: ${form.nuf || '-'}`);
  doc.text(`VF: ${form.tf || '-'}`);
  doc.text(`BGF: ${form.bgf || '-'}`);



  doc.end();
}