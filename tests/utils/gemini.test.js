import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseReceiptWithGemini } from '../../src/utils/gemini'

describe('parseReceiptWithGemini', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses clean JSON response into items array', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: '[{"name":"Nasi Goreng","price":45000},{"name":"Es Teh","price":15000}]' }]
          }
        }]
      })
    })

    const result = await parseReceiptWithGemini('base64data', 'image/jpeg', 'test-key')
    expect(result).toEqual([
      { name: 'Nasi Goreng', price: 45000 },
      { name: 'Es Teh', price: 15000 },
    ])
  })

  it('strips markdown code fences from response', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: '```json\n[{"name":"Ayam Bakar","price":55000}]\n```' }]
          }
        }]
      })
    })

    const result = await parseReceiptWithGemini('base64data', 'image/png', 'test-key')
    expect(result).toEqual([{ name: 'Ayam Bakar', price: 55000 }])
  })

  it('throws on non-ok HTTP response', async () => {
    fetch.mockResolvedValue({ ok: false, status: 400 })
    await expect(parseReceiptWithGemini('data', 'image/jpeg', 'test-key'))
      .rejects.toThrow('Gemini API error: 400')
  })

  it('throws when no API key provided', async () => {
    await expect(parseReceiptWithGemini('data', 'image/jpeg', ''))
      .rejects.toThrow('VITE_GEMINI_API_KEY is not set')
  })
})
