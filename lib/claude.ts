import { supabase } from './supabase';

export type Message = { role: 'user' | 'assistant'; content: string };

export async function sendMessageToClaude(
  messages: Message[],
  userFinancialContext: string,
  _authToken: string
): Promise<string> {
  const systemPrompt = `Tớ là FinMate — người bạn đồng hành tài chính thân thiện, nói chuyện tự nhiên như nhắn tin với bạn thân, không phải robot.

Dữ liệu tài chính thực của người dùng (cập nhật mới nhất):
${userFinancialContext}

Về dữ liệu giao dịch:
- Mỗi giao dịch có ngày cụ thể (Hôm nay / Hôm qua / ngày/tháng), danh mục, tên chi tiêu và số tiền
- Khi người dùng hỏi về ngày cụ thể (hôm nay, hôm qua, ngày X...), hãy lọc và trả lời dựa trên đúng ngày đó trong dữ liệu
- Nếu không có giao dịch nào trong ngày được hỏi, hãy nói rõ là không có

Cách trả lời:
- Xưng "tớ", gọi người dùng là "cậu"
- Viết tự nhiên, gần gũi, đôi khi dí dỏm — như đang nhắn tin
- TUYỆT ĐỐI không dùng markdown: không #, không *, không **, không gạch đầu dòng kiểu "-"
- Nếu liệt kê thì viết thành câu hoặc dùng số "1. 2. 3." thôi
- Dùng emoji tự nhiên, vừa phải
- Câu ngắn, dễ đọc trên điện thoại
- Đưa lời khuyên cụ thể dựa trên dữ liệu thực, nhắc đúng tên chi tiêu khi phân tích
- Ăn mừng khi cậu ấy làm tốt, động viên khi chi nhiều
- Dưới 150 từ trừ khi được hỏi chi tiết
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
  recentExpenses?: Array<{ note?: string; category: string; amount: number; date: string }>;
}): string {
  const { totalThisMonth, byCategory, budget, goals, currency, recentExpenses } = params;

  const categoryLines = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `  - ${cat}: ${currency}${amt.toFixed(0)}`)
    .join('\n');

  const goalLines = goals
    .map((g) => `  - "${g.title}": ${currency}${g.saved}/${currency}${g.target} (${Math.round((g.saved / g.target) * 100)}%)`)
    .join('\n');

  const toLocalStr = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = toLocalStr(new Date().toISOString());
  const yesterdayStr = toLocalStr(new Date(Date.now() - 86400000).toISOString());

  const expenseLines = recentExpenses && recentExpenses.length > 0
    ? recentExpenses
        .map((e) => {
          const localStr = toLocalStr(e.date);
          const dateLabel = localStr === todayStr ? 'Hôm nay'
            : localStr === yesterdayStr ? 'Hôm qua'
            : `${new Date(e.date).getDate()}/${new Date(e.date).getMonth() + 1}`;
          return `  - ${dateLabel} | ${e.category}${e.note ? ` | "${e.note}"` : ''}: ${currency}${e.amount.toFixed(0)}`;
        })
        .join('\n')
    : '  (chưa có giao dịch)';

  const nowDate = new Date();
  const day = nowDate.getDate();
  const month = nowDate.getMonth() + 1;
  const year = nowDate.getFullYear();
  const daysInMonth = new Date(year, nowDate.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - day;

  return `
Ngày hôm nay: ${day}/${month}/${year} (còn ${daysLeft} ngày nữa hết tháng)
Ngân sách tháng: ${budget ? `${currency}${budget.toFixed(0)}` : 'chưa đặt'}
Chi tiêu tháng này: ${currency}${totalThisMonth.toFixed(0)}${budget ? ` (${Math.round((totalThisMonth / budget) * 100)}% ngân sách)` : ''}
Chi tiêu theo danh mục:
${categoryLines || '  (chưa có chi tiêu)'}
Giao dịch gần đây (ngày | danh mục | ghi chú: số tiền):
${expenseLines}
Mục tiêu tiết kiệm:
${goalLines || '  (chưa có mục tiêu)'}
  `.trim();
}