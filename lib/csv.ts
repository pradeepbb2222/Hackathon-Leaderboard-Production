export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i += 1) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else inQuotes = false;
      } else cell += char;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell.trim());
      cell = "";
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      continue;
    }
    if (char !== "\r") cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value.length)) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.toLowerCase().replace(/\s+/g, "_"));
  return rows.slice(1).map((values) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? "";
    });
    return record;
  });
}

export function toCsv(headers: string[], rows: string[][]) {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  return [headers, ...rows].map((line) => line.map((value) => escape(value ?? "")).join(",")).join("\n");
}

export function pickField(record: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (record[key]?.trim()) return record[key].trim();
  }
  return "";
}
