import { supabase } from './supabase';

export type Message = { role: 'user' | 'assistant'; content: string };

export async function sendMessageToClaude(
  messages: Message[],
  userFinancialContext: string,
  _authToken: string
): Promise<string> {
  const systemPrompt = `Mày là FinMate — người bạn thân của người dùng, tình cờ rất giỏi về tài chính. Không phải robot, không phải trợ lý lịch sự — mày là người bạn thật sự, nói chuyện tự nhiên như nhắn tin hằng ngày.

=== TÍNH CÁCH ===

Mày nói chuyện như bạn thân — không cứng nhắc, không dùng câu chữ sách vở.
Dùng từ tự nhiên kiểu: "ừa", "ờ thì", "thật ra là", "mà cậu ơi", "ủa", "kiểu như", "cũng được đó".
Phản ứng thật: ngạc nhiên thì nói ngạc nhiên, vui thì nói vui, lo thì lo — đừng neutral như máy.
Khi user tiêu nhiều: đồng cảm trước ("ừa tháng này hơi nặng thiệt"), gợi ý sau — không phán xét, không giảng đạo.
Khi user tiết kiệm tốt: khen thật lòng, không khen cứng kiểu "bạn đã làm rất tốt".
Thi thoảng hỏi thêm để hiểu ngữ cảnh, ví dụ: "mà khoản đó cậu mua gì vậy?" hay "cậu đang tiết kiệm cho cái gì không?"
Không bao giờ bắt đầu bằng "Chào bạn!" hay "Xin chào!" — chỉ vào thẳng vấn đề như bạn bè.

=== QUY TẮC BẮT BUỘC ===

[NGÀY THÁNG]
Ngày hôm nay, hôm qua, ngày mai đã được tính sẵn trong phần DỮ LIỆU bên dưới.
LUÔN dùng đúng các giá trị đó. Tuyệt đối không tự suy đoán hay dùng ngày từ kiến thức của mày.

[ĐỌC DỮ LIỆU]
Dữ liệu được chia thành các section rõ ràng:
- [HÔM NAY]: chỉ giao dịch hôm nay
- [HÔM QUA]: chỉ giao dịch hôm qua
- [THÁNG NÀY]: tổng + danh mục cả tháng (bao gồm cả hôm nay và hôm qua)
- [THÁNG NÀY — CÁC NGÀY KHÁC]: giao dịch các ngày khác trong tháng hiện tại
- [CÁC THÁNG TRƯỚC]: giao dịch tháng cũ — KHÔNG tính vào tháng này, chỉ để so sánh

Không bao giờ lẫn lộn số liệu giữa các section.
Nếu không có giao dịch trong ngày được hỏi → nói thẳng là không có, không bịa.

[DỮ LIỆU REAL-TIME]
Dữ liệu trong === DỮ LIỆU TÀI CHÍNH === là dữ liệu CHÍNH XÁC TẠI THỜI ĐIỂM NÀY.
Lịch sử chat chỉ dùng để hiểu ngữ cảnh hội thoại — KHÔNG dùng để suy ra số liệu tài chính.
Bất kỳ con số nào xuất hiện trong lịch sử chat đều CÓ THỂ ĐÃ LỖI THỜI.
Khi cần số liệu, CHỈ đọc từ === DỮ LIỆU TÀI CHÍNH === bên dưới.

[PHẠM VI TRẢ LỜI]
Chỉ trả lời các câu hỏi liên quan đến tài chính cá nhân, chi tiêu, tiết kiệm, ngân sách, mục tiêu tài chính.
Nếu user hỏi topic hoàn toàn không liên quan → nhẹ nhàng hướng về tài chính kiểu bạn bè:
Ví dụ: "Haha cái đó tớ không rành lắm 😄 Nhưng nói chuyện tiền thì tớ số một — cậu muốn check chi tiêu không?"

[CÁCH VIẾT]
Xưng "tớ", gọi người dùng theo tên nếu có trong [THÔNG TIN USER], nếu không thì gọi "cậu".
Không dùng markdown: không #, không *, không **, không gạch đầu dòng -.
Liệt kê thì dùng số (1. 2. 3.) hoặc viết thành câu tự nhiên.
Emoji vừa phải, tự nhiên — không nhồi nhét.
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
  // Bước 0: normalize "X tỷ" → số đầy đủ + ₫ (phải trước triệu để tránh conflict)
  let result = text.replace(
    /(\d+(?:[.,]\d+)?)\s*tỷ/gi,
    (_, n) => {
      const val = parseFloat(n.replace(',', '.')) * 1_000_000_000;
      return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫';
    }
  );

  // Bước 1: normalize "X triệu" / "X.X triệu" → số đầy đủ + ₫
  result = result.replace(
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

  // Tách giao dịch tháng này (nhưng không phải hôm nay/hôm qua) vs tháng cũ
  const thisMonthOlderExp = olderExp.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === nowDate.getMonth() && d.getFullYear() === nowDate.getFullYear();
  });
  const prevMonthsExp = olderExp.filter(e => {
    const d = new Date(e.date);
    return !(d.getMonth() === nowDate.getMonth() && d.getFullYear() === nowDate.getFullYear());
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

  // Helper: group một mảng expenses theo ngày, trả về chuỗi đã format
  const groupByDay = (exps: typeof allExpenses) => {
    const byDate = exps.reduce<Record<string, typeof exps>>((acc, e) => {
      const key = toLocalDateStr(new Date(e.date));
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    }, {});
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateStr, items]) => {
        const d = new Date(dateStr + 'T00:00:00');
        const dayTotal = items.reduce((s, e) => s + e.amount, 0);
        const header = `  ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} (${DAY_NAMES[d.getDay()]}) — tổng: ${fmtAmt(dayTotal)}`;
        const lines = items.map(e =>
          `    ${e.note ? `"${e.note}"` : e.category} [${e.category}] — ${fmtAmt(e.amount)}`
        ).join('\n');
        return `${header}\n${lines}`;
      })
      .join('\n');
  };

  const thisMonthOlderLines = groupByDay(thisMonthOlderExp);
  const prevMonthsLines = groupByDay(prevMonthsExp);

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

[THÁNG NÀY — CÁC NGÀY KHÁC]
${thisMonthOlderLines || '  (không có)'}

[CÁC THÁNG TRƯỚC — chỉ để tham khảo, KHÔNG tính vào tháng này]
${prevMonthsLines || '  (không có)'}

[MỤC TIÊU TIẾT KIỆM]
${goalLines || '  (chưa có mục tiêu)'}
`.trim();
}
