// ============ KI BELEG-SCANNER (OpenAI Vision) ============
// Liest ein Beleg-/Kassenzettel-Bild ein und extrahiert per OpenAI Vision
// die wichtigsten Daten (Händler, Gesamtbetrag, Datum, Kategorie, Einzelposten).
// Der API-Key gehört jedem User selbst und wird pro User in Firestore gespeichert.

// Default-Modell – bewusst ein weit verfügbares Vision-fähiges Modell.
export const DEFAULT_AI_MODEL = 'gpt-4o';

// Liest eine Bilddatei ein und skaliert sie auf eine vernünftige Größe herunter,
// damit der Upload klein bleibt und die Erkennung trotzdem zuverlässig ist.
// Gibt eine JPEG-Data-URL zurück.
export function fileToDataUrl(file, maxSize = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Keine Datei ausgewählt'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          // Fallback: Original-Data-URL verwenden
          resolve(reader.result);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Baut aus den erkannten Einzelposten einen sauberen Notiz-Text.
export function buildNotesFromItems(items, currencySymbol = '€') {
  if (!Array.isArray(items) || items.length === 0) return '';
  return items
    .filter(it => it && (it.name || it.price != null))
    .map(it => {
      const name = (it.name || '').toString().trim() || 'Position';
      const qty = it.quantity && Number(it.quantity) > 1 ? `${it.quantity}x ` : '';
      const price = it.price != null && !isNaN(parseFloat(it.price))
        ? `${parseFloat(it.price).toFixed(2).replace('.', ',')} ${currencySymbol}`
        : '';
      return price ? `${qty}${name}: ${price}` : `${qty}${name}`;
    })
    .join('\n');
}

// Ruft die OpenAI-API mit dem Beleg-Bild auf und gibt das strukturierte Ergebnis zurück.
export async function scanReceiptImage({ dataUrl, apiKey, categories = [], model = DEFAULT_AI_MODEL }) {
  if (!apiKey) throw new Error('Kein OpenAI API-Key hinterlegt. Bitte in den Einstellungen eintragen.');
  if (!dataUrl) throw new Error('Kein Bild vorhanden');

  const today = new Date().toISOString().split('T')[0];
  const catList = categories.length ? categories.map(c => `"${c}"`).join(', ') : '(keine vorgegeben)';

  const systemPrompt = [
    'Du bist ein präziser Assistent, der Fotos von Kassenzetteln und Belegen analysiert.',
    'Extrahiere die Daten und antworte AUSSCHLIESSLICH mit einem JSON-Objekt (kein Markdown, kein Text drumherum).',
    'Das JSON-Objekt hat exakt folgendes Format:',
    '{',
    '  "merchant": string,        // Name des Geschäfts / Händlers, z.B. "REWE", "Restaurant Bella"',
    '  "total": number,           // Gesamt-/Endbetrag als Zahl mit Punkt, z.B. 12.30',
    '  "currency": string,        // ISO-Währungscode, z.B. "EUR", "USD"',
    '  "date": string,            // Kaufdatum im Format YYYY-MM-DD',
    '  "category": string,        // passendste Kategorie aus der vorgegebenen Liste, sonst ""',
    '  "items": [ { "name": string, "price": number, "quantity": number } ]  // einzelne Positionen',
    '}',
    `Wähle "category" möglichst aus dieser Liste vorhandener Kategorien: ${catList}. Wenn keine passt, gib "" zurück.`,
    `Wenn kein Datum erkennbar ist, verwende "${today}".`,
    'Bei "total" nimm den tatsächlich zu zahlenden Endbetrag (inkl. Steuern, nach Rabatten).',
    'Gib Preise immer als positive Zahlen mit Dezimalpunkt an. "quantity" ist optional (Standard 1).',
    'Wenn ein Wert nicht erkennbar ist, lass das Feld leer (string "" bzw. lasse items leer).',
  ].join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analysiere diesen Beleg und gib das JSON zurück.' },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message || '';
    } catch { /* ignore */ }
    if (res.status === 401) throw new Error('API-Key ungültig. Bitte in den Einstellungen prüfen.');
    if (res.status === 429) throw new Error('OpenAI-Limit erreicht oder kein Guthaben. Bitte später erneut versuchen.');
    throw new Error(`OpenAI-Fehler (${res.status})${detail ? ': ' + detail : ''}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Keine Antwort von der KI erhalten');

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Antwort der KI konnte nicht gelesen werden');
  }

  // Datum validieren / normalisieren
  let date = (parsed.date || '').toString().trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = today;

  // Kategorie nur übernehmen, wenn sie wirklich existiert (case-insensitive)
  let category = (parsed.category || '').toString().trim();
  if (category) {
    const match = categories.find(c => c.toLowerCase() === category.toLowerCase());
    category = match || '';
  }

  const total = parseFloat(parsed.total);

  return {
    merchant: (parsed.merchant || '').toString().trim(),
    total: isNaN(total) ? null : total,
    currency: (parsed.currency || '').toString().trim().toUpperCase(),
    date,
    category,
    items: Array.isArray(parsed.items) ? parsed.items : [],
  };
}
