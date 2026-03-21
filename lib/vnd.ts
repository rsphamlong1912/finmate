// Format số tiền VNĐ
// VD: 1200000 → "1.200.000₫"
export function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + '₫';
}

// Format gọn cho số lớn
// VD: 1200000 → "1,2tr₫"
export function formatVNDShort(amount: number): string {
  if (amount >= 1_000_000_000) return (amount / 1_000_000_000).toFixed(1) + 'tỷ₫';
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'tr₫';
  if (amount >= 1_000) return (amount / 1_000).toFixed(0) + 'k₫';
  return amount + '₫';
}

// Parse chuỗi nhập vào thành số VNĐ
// Hỗ trợ: "50k" → 50000, "1tr" → 1000000, "1.5tr" → 1500000
export function parseVND(input: string): number {
  const s = input.trim().toLowerCase().replace(/[₫,\.]/g, '');
  if (s.endsWith('tr')) return parseFloat(s) * 1_000_000;
  if (s.endsWith('k')) return parseFloat(s) * 1_000;
  return parseFloat(s) || 0;
}