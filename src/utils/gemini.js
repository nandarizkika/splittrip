const PROMPT =
  'You are a receipt parser. Extract all line items from this receipt. ' +
  'Return ONLY a JSON array with no markdown, no explanation. ' +
  'Format: [{"name": "Item Name", "price": 45000}, ...]. ' +
  'Prices as integers in the original currency, no symbols.'

export async function parseReceiptWithGemini(
  imageBase64,
  mimeType,
  apiKey = import.meta.env.VITE_GEMINI_API_KEY
) {
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

  const body = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mimeType, data: imageBase64 } },
        { text: PROMPT },
      ]
    }]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}
