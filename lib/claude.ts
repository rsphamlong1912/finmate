import { supabase } from './supabase';

export type Message = { role: 'user' | 'assistant'; content: string };

export async function sendMessageToClaude(
  messages: Message[],
  userFinancialContext: string,
  _authToken: string
): Promise<string> {
  const systemPrompt = `Mày là FinMate — trợ lý tài chính cá nhân của người dùng. Đọc dữ liệu thực bên dưới và trả lời chính xác, thân thiện.

=== QUY TẮC BẮT BUỘC ===

[NGÀY THÁNG]
Ngày hôm nay, hôm qua, ngày mai đã được tính sẵn trong phần DỮ LIỆU bên dưới.
LUÔN dùng đúng các giá trị đó. Tuyệt đối không tự suy đoán hay dùng ngày từ kiến thức của mày.

[ĐỌC DỮ LIỆU]
Dữ liệu được chia thành các section rõ ràng:
- [HÔM NAY]: chỉ giao dịch hôm nay → dùng khi user hỏi về hôm nay
- [HÔM QUA]: chỉ giao dịch hôm qua → dùng khi user hỏi về hôm qua
- [THÁNG NÀY]: tổng cả tháng, KHÔNG phải hôm nay
- [CÁC NGÀY TRƯỚC]: giao dịch các ngày khác, có tổng theo từng ngày

Không bao giờ lẫn lộn số liệu giữa các section.
Nếu không có giao dịch trong ngày được hỏi → nói thẳng là không có, không bịa.

[DỮ LIỆU REAL-TIME]
Dữ liệu trong === DỮ LIỆU TÀI CHÍNH === là dữ liệu CHÍNH XÁC TẠI THỜI ĐIỂM NÀY.
Lịch sử chat chỉ dùng để hiểu ngữ cảnh hội thoại — KHÔNG dùng để suy ra số liệu tài chính.
Bất kỳ con số nào xuất hiện trong lịch sử chat đều CÓ THỂ ĐÃ LỖI THỜI.
Khi cần số liệu, CHỈ đọc từ === DỮ LIỆU TÀI CHÍNH === bên dưới.

[PHẠM VI TRẢ LỜI]
Chỉ trả lời các câu hỏi liên quan đến tài chính cá nhân, chi tiêu, tiết kiệm, ngân sách, mục tiêu tài chính.
Nếu user hỏi topic hoàn toàn không liên quan (nấu ăn, thể thao, kỹ thuật...) → nhẹ nhàng hướng về tài chính:
Ví dụ: "Tớ chỉ giỏi về tài chính thôi 😄 Cậu có muốn xem chi tiêu hôm nay không?"

[CÁCH VIẾT]
Xưng "tớ", gọi người dùng theo tên nếu có trong [THÔNG TIN USER], nếu không thì gọi "cậu".
Tự nhiên, gần gũi, đôi khi hài hước — như nhắn tin với bạn thân.
Không dùng markdown: không #, không *, không **, không gạch đầu dòng -.
Liệt kê thì dùng số (1. 2. 3.) hoặc viết thành câu.
Emoji vừa phải, tự nhiên.
Dưới 150 từ trừ khi được hỏi chi tiết.
Luôn trả lời bằng tiếng Việt.

[FORMAT SỐ TIỀN]
Khi viết số tiền trong câu trả lời, LUÔN dùng dấu chấm ngăn cách hàng nghìn và ký hiệu ₫ ĐẶT SAU số.
Ví dụ đúng: 1.200.000₫ / 50.000₫ / 3.500.000₫
Ví dụ sai: ₫1.200.000 / 50000đ / 1,200,000 / 1.2 triệu (không viết tắt)

=== DỮ LIỆU TÀI CHÍNH ===
${userFinancialContext}`;

  const { data, error } = await supabase.functions.invoke('chat', {
    body: { messages, systemPrompt },
  });

  if (error) throw new Error(error.message);
  return normalizeAmounts(data?.content ?? 'Không có phản hồi');
}

// Chuẩn hóa số tiền trong response của AI về định dạng 1.000.000₫
export function normalizeAmounts(text: string): string {
  // Bước 1: normalize "X triệu" / "X tr" / "X.X triệu" → số đầy đủ + ₫
  let result = text.replace(
    /(\d+(?:[.,]\d+)?)\s*tri[eệ]u/gi,
    (_, n) => {
      const val = parseFloat(n.replace(',', '.')) * 1_000_000;
      return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
    }
  );

  // Bước 2: normalize số + ký hiệu tiền tệ (₫ đ đồng VND) — cả prefix lẫn suffix
  result = result.replace(
    /₫\s*(\d+(?:[.,]\d+)*)|(\d+(?:[.,]\d+)*)\s*(?:₫|đ(?:ồng)?|VNĐ|VND)/gi,
    (match, prefixNum, suffixNum) => {
      const numStr = prefixNum ?? suffixNum;
      const raw = parseInt(numStr.replace(/[.,]/g, ''), 10);
      if (isNaN(raw)) return match;
      return raw.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
    }
  );

  return result;
}

// Tạo financial context từ dữ liệu user để đưa vào prompt
export function buildFinancialContext(params: {
  totalThisMonth: number;
  byCategory: Record<string, number>;
  budget?: number;
  goals: Array<{ title: string; saved: number; target: number }>;
  currency: string;
  displayName?: string | null;
  recentExpenses?: Array<{ note?: string; category: string; amount: number; date: string }>;
}): string {
  const { totalThisMonth, byCategory, budget, goals, currency, displayName, recentExpenses } = params;

  // Dùng local getters để tránh nhầm UTC vs timezone local
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // ₫ đặt SAU số — đúng convention tiếng Việt và nhất quán với system prompt
  const fmtAmt = (n: number) =>
    Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + currency;

  const nowDate = new Date();
  const todayStr = toLocalDateStr(nowDate);

  const yesterday = new Date(nowDate);
  yesterday.setDate(nowDate.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  const tomorrow = new Date(nowDate);
  tomorrow.setDate(nowDate.getDate() + 1);

  const day = nowDate.getDate();
  const month = nowDate.getMonth() + 1;
  const year = nowDate.getFullYear();
  const daysInMonth = new Date(year, nowDate.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - day;

  const allExpenses = recentExpenses ?? [];
  const todayExp = allExpenses.filter(e => toLocalDateStr(new Date(e.date)) === todayStr);
  const yesterdayExp = allExpenses.filter(e => toLocalDateStr(new Date(e.date)) === yesterdayStr);
  const olderExp = allExpenses.filter(e => {
    const s = toLocalDateStr(new Date(e.date));
    return s !== todayStr && s !== yesterdayStr;
  });

  const todayTotal = todayExp.reduce((s, e) => s + e.amount, 0);
  const yesterdayTotal = yesterdayExp.reduce((s, e) => s + e.amount, 0);

  const fmtLine = (e: { note?: string; category: string; amount: number }) =>
    `  ${e.note ? `"${e.note}"` : e.category} [${e.category}] — ${fmtAmt(e.amount)}`;

  const monthCatLines = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, amt]) => `  ${cat}: ${fmtAmt(amt)}`)
    .join('\n');

  // Fix #2: tránh division by zero khi target = 0
  const goalLines = goals
    .map(g => {
      const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
      return `  "${g.title}": đã tiết kiệm ${fmtAmt(g.saved)} / mục tiêu ${fmtAmt(g.target)} (${pct}%)`;
    })
    .join('\n');

  const DAY_NAMES = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(nowDate);
    d.setDate(nowDate.getDate() - (6 - i));
    const isoDay = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    const label = i === 6 ? 'hôm nay' : i === 5 ? 'hôm qua' : '';
    return `  ${isoDay} — ${DAY_NAMES[d.getDay()]}${label ? ` (${label})` : ''}`;
  }).join('\n');

  // Fix #4 + #7: group olderExp theo ngày, có tổng từng ngày, tách rõ tháng
  const olderByDate = olderExp.reduce<Record<string, typeof olderExp>>((acc, e) => {
    const key = toLocalDateStr(new Date(e.date));
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const olderLines = Object.entries(olderByDate)
    .sort(([a], [b]) => b.localeCompare(a)) // mới nhất trước
    .map(([dateStr, exps]) => {
      const d = new Date(dateStr + 'T00:00:00');
      const dayTotal = exps.reduce((s, e) => s + e.amount, 0);
      const header = `  ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} (${DAY_NAMES[d.getDay()]}) — tổng: ${fmtAmt(dayTotal)}`;
      const lines = exps.map(e =>
        `    ${e.note ? `"${e.note}"` : e.category} [${e.category}] — ${fmtAmt(e.amount)}`
      ).join('\n');
      return `${header}\n${lines}`;
    })
    .join('\n');

  // Fix #6: phân biệt "chưa đặt ngân sách" vs "ngân sách = 0"
  const budgetLine = budget == null
    ? 'chưa đặt'
    : budget === 0
      ? '0₫ (đã đặt về 0)'
      : `${fmtAmt(budget)}`;

  return `
[THÔNG TIN USER]
Tên: ${displayName || 'chưa cập nhật'}

[NGÀY]
Hôm nay: ${day}/${month}/${year} (${DAY_NAMES[nowDate.getDay()]})
Hôm qua: ${yesterday.getDate()}/${yesterday.getMonth() + 1}/${yesterday.getFullYear()} (${DAY_NAMES[yesterday.getDay()]})
Ngày mai: ${tomorrow.getDate()}/${tomorrow.getMonth() + 1}/${tomorrow.getFullYear()} (${DAY_NAMES[tomorrow.getDay()]})
Còn ${daysLeft} ngày trong tháng ${month}/${year}
7 ngày gần nhất:
${last7}

[HÔM NAY — ${day}/${month}/${year}]
Tổng chi: ${fmtAmt(todayTotal)}
Giao dịch (${todayExp.length} khoản):
${todayExp.length > 0 ? todayExp.map(fmtLine).join('\n') : '  (không có giao dịch hôm nay)'}

[HÔM QUA — ${yesterday.getDate()}/${yesterday.getMonth() + 1}/${yesterday.getFullYear()}]
Tổng chi: ${fmtAmt(yesterdayTotal)}
Giao dịch (${yesterdayExp.length} khoản):
${yesterdayExp.length > 0 ? yesterdayExp.map(fmtLine).join('\n') : '  (không có giao dịch hôm qua)'}

[THÁNG NÀY — tháng ${month}/${year}]
Ngân sách: ${budgetLine}
Tổng chi cả tháng: ${fmtAmt(totalThisMonth)}${budget ? ` (đã dùng ${Math.round((totalThisMonth / budget) * 100)}% ngân sách, còn ${fmtAmt(Math.max(budget - totalThisMonth, 0))})` : ''}
Chi theo danh mục:
${monthCatLines || '  (chưa có chi tiêu)'}

[CÁC NGÀY TRƯỚC]
${olderLines || '  (không có)'}

[MỤC TIÊU TIẾT KIỆM]
${goalLines || '  (chưa có mục tiêu)'}
`.trim();
}
