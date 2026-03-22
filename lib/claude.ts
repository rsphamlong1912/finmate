import { supabase } from './supabase';

export type Message = { role: 'user' | 'assistant'; content: string };

export async function sendMessageToClaude(
  messages: Message[],
  userFinancialContext: string,
  _authToken: string
): Promise<string> {
  const systemPrompt = `Tớ là FinMate — người bạn đồng hành tài chính thân thiện, nói chuyện tự nhiên như nhắn tin với bạn thân, không phải robot.

Dữ liệu tài chính của người dùng:
${userFinancialContext}

Cách trả lời:
- Xưng "tớ", gọi người dùng là "cậu"
- Viết tự nhiên, gần gũi, đôi khi dí dỏm — như đang nhắn tin
- TUYỆT ĐỐI không dùng markdown: không #, không *, không **, không gạch đầu dòng kiểu "-"
- Nếu liệt kê thì viết thành câu hoặc dùng số "1. 2. 3." thôi
- Dùng emoji tự nhiên, vừa phải
- Câu ngắn, dễ đọc trên điện thoại
- Đưa lời khuyên cụ thể dựa trên dữ liệu thực
- Ăn mừng khi bạn ấy làm tốt, động viên khi chi nhiều
- Dưới 120 từ trừ khi được hỏi chi tiết
- Luôn trả lời bằng tiếng Việt`;

  const { data, error } = await supabase.functions.invoke('chat', {
    body: { messages, systemPrompt },
  });

  if (error) throw new Error(error.message);
  return data?.content ?? 'Không có phản hồi';
}

// Tạo financial context từ dữ liệu user để đưa vào prompt
export function buildFinancialContext(params: {
  totalThisMonth: number;
  byCategory: Record<string, number>;
  budget?: number;
  goals: Array<{ title: string; saved: number; target: number }>;
  currency: string;
}): string {
  const { totalThisMonth, byCategory, budget, goals, currency } = params;

  const categoryLines = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `  - ${cat}: ${currency}${amt.toFixed(0)}`)
    .join('\n');

  const goalLines = goals
    .map((g) => `  - "${g.title}": ${currency}${g.saved}/${currency}${g.target} (${Math.round((g.saved / g.target) * 100)}%)`)
    .join('\n');

  return `
Ngân sách tháng: ${budget ? `${currency}${budget.toFixed(0)}` : 'chưa đặt'}
Chi tiêu tháng này: ${currency}${totalThisMonth.toFixed(0)}${budget ? ` (${Math.round((totalThisMonth / budget) * 100)}% ngân sách)` : ''}
Chi tiêu theo danh mục:
${categoryLines || '  (chưa có chi tiêu)'}
Mục tiêu tiết kiệm:
${goalLines || '  (chưa có mục tiêu)'}
  `.trim();
}