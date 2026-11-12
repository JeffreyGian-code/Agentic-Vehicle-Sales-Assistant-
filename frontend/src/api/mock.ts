import { ChatError, type ChatResponse } from './types'

/**
 * In-browser mock of the API (enabled with VITE_USE_MOCK=true).
 *
 * Include one of these in a message to exercise UI states:
 *   /429    -> per-IP rate limit
 *   /limit  -> conversation limit reached
 *   /500    -> server error
 *   /slow   -> very slow reply
 */

const callsPerSession = new Map<string, number>()
const MOCK_THREAD_LIMIT = 5

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

const SEDAN_REPLY = `Here are some **Honda sedans under ₹10 lakh** I found in our inventory:

| Model | Variant | Fuel | Transmission | Price |
|-------|---------|------|--------------|-------|
| Honda Amaze | S | Petrol | Manual | **₹7,62,000** |
| Honda Amaze | VX CVT | Petrol | Automatic | **₹9,04,000** |
| Honda City | SV | Petrol | Manual | **₹9,85,000** |

A few notes:
- The **Amaze VX CVT** is a great pick if you want an automatic on a budget.
- The **City SV** gives you more cabin space and a bigger boot.

Would you like me to calculate the EMI for any of these?`

const SUV_REPLY = `Here are some **SUVs under ₹20 lakh**:

1. **Hyundai Creta SX**: ₹15,20,000 · Petrol · Automatic
2. **Kia Seltos HTX**: ₹16,40,000 · Diesel · Manual
3. **Mahindra XUV700 MX**: ₹14,99,000 · Petrol · Manual
4. **Tata Harrier Pure**: ₹18,75,000 · Diesel · Manual

Do you have a preference for fuel type or seating capacity?`

function emiReply(principal: number, rate: number, years: number) {
  const r = rate / 12 / 100
  const n = years * 12
  const emi = r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1)
  const total = emi * n
  const fmt = (v: number) => '₹' + Math.round(v).toLocaleString('en-IN')
  return [
    "Here's the EMI breakdown:",
    '',
    '| Item | Amount |',
    '|---|---|',
    `| Loan amount | ${fmt(principal)} |`,
    `| Interest rate | ${rate}% p.a. |`,
    `| Tenure | ${years} years (${n} months) |`,
    `| **Monthly EMI** | **${fmt(emi)}** |`,
    `| Total interest | ${fmt(total - principal)} |`,
    `| Total payable | ${fmt(total)} |`,
    '',
    "Let me know if you'd like to compare a different tenure.",
  ].join('\n')
}

function parseAmount(text: string): number | null {
  const lakh = text.match(/(\d+(?:\.\d+)?)\s*(lakh|lac)/i)
  if (lakh) return parseFloat(lakh[1]) * 100_000
  const plain = text.match(/₹?\s*(\d[\d,]{4,})/)
  return plain ? parseInt(plain[1].replace(/,/g, ''), 10) : null
}

function buildReply(message: string): { reply: string; cost: number } {
  const m = message.toLowerCase()
  if (m.includes('emi') || m.includes('loan')) {
    const principal = parseAmount(m)
    const rate = m.match(/(\d+(?:\.\d+)?)\s*%/)
    const years = m.match(/(\d+)\s*(years?|yrs?)/)
    if (principal && rate && years) {
      return { reply: emiReply(principal, parseFloat(rate[1]), parseInt(years[1], 10)), cost: 2 }
    }
    return {
      reply:
        'Happy to calculate that! Could you tell me the **loan amount**, **interest rate** and **tenure** (in years)?',
      cost: 1,
    }
  }
  if (m.includes('suv')) return { reply: SUV_REPLY, cost: 2 }
  if (m.includes('sedan') || m.includes('honda') || m.includes('car')) {
    return { reply: SEDAN_REPLY, cost: 2 }
  }
  return {
    reply:
      "I'm your vehicle sales assistant. I can **search our inventory** by brand, body type, fuel or budget, and **calculate EMIs**. What are you looking for?",
    cost: 1,
  }
}

export async function mockSendMessage(
  message: string,
  sessionId?: string | null,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const id = sessionId ?? crypto.randomUUID()
  const text = message.trim()

  await wait(text.includes('/slow') ? 8000 : 900 + Math.random() * 1600, signal)

  if (!text) throw new ChatError('validation', 'String should have at least 1 character', 422)
  if (text.includes('/429')) {
    throw new ChatError('ip-rate-limit', 'Too many requests from your IP. Please try again later.', 429)
  }
  if (text.includes('/500')) {
    throw new ChatError('server', 'Something went wrong while processing your request.', 500)
  }

  const used = callsPerSession.get(id) ?? 0
  const { reply, cost } = buildReply(text)
  if (text.includes('/limit') || used + cost > MOCK_THREAD_LIMIT) {
    throw new ChatError(
      'conversation-limit',
      'The processing limit for this conversation was reached. Please start a new conversation.',
      429,
    )
  }
  callsPerSession.set(id, used + cost)
  return { reply, session_id: id }
}

export async function mockHealth(): Promise<boolean> {
  await wait(150)
  return true
}
