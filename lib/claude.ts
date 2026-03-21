export type Message = { role: 'user' | 'assistant'; content: string };

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
// Đặt API key trong Supabase Edge Function để bảo mật
// Đây là wrapper gọi qua Edge Function của bạn
const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/chat`;

export async function sendMessageToClaude(
  messages: Message[],
  userFinancialContext: string,
  authToken: string
): Promise<string> {
  const systemPrompt = `You are an expert personal finance coach called "FinMate". 
You help users manage their money, track spending, and achieve savings goals.
Be concise, friendly, and practical. Always respond in the same language the user uses.

Current user financial data:
${userFinancialContext}

Guidelines:
- Give specific, actionable advice based on their actual data
- Point out spending patterns (both good and bad)
- Suggest realistic savings targets
- Celebrate wins and progress
- Keep responses under 150 words unless user asks for detail`;

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ messages, systemPrompt }),
  });

  if (!response.ok) {
    throw new Error('Failed to get AI response');
  }

  const data = await response.json();
  console.log('Claude response:', JSON.stringify(data));
  if (!response.ok) throw new Error(data.error || 'API error');
  return data.content ?? 'Không có phản hồi';
}

// Tạo financial context từ dữ liệu user để đưa vào prompt
export function buildFinancialContext(params: {
  totalThisMonth: number;
  byCategory: Record<string, number>;
  goals: Array<{ title: string; saved: number; target: number }>;
  currency: string;
}): string {
  const { totalThisMonth, byCategory, goals, currency } = params;

  const categoryLines = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `  - ${cat}: ${currency}${amt.toFixed(0)}`)
    .join('\n');

  const goalLines = goals
    .map((g) => `  - "${g.title}": ${currency}${g.saved}/${currency}${g.target} (${Math.round((g.saved / g.target) * 100)}%)`)
    .join('\n');

  return `
Total spending this month: ${currency}${totalThisMonth.toFixed(0)}
Breakdown by category:
${categoryLines || '  (no expenses yet)'}
Savings goals:
${goalLines || '  (no goals set)'}
  `.trim();
}