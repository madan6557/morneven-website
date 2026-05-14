export function formatCompactNumber(value: number | null | undefined) {
  const safeValue = Number.isFinite(value ?? 0) ? Number(value ?? 0) : 0;
  const absolute = Math.abs(safeValue);

  if (absolute < 1000) return String(safeValue);

  const units = [
    { value: 1_000_000_000, suffix: "b" },
    { value: 1_000_000, suffix: "m" },
    { value: 1_000, suffix: "k" },
  ];
  const unit = units.find((entry) => absolute >= entry.value);
  if (!unit) return String(safeValue);

  const formatted = safeValue / unit.value;
  const compact = formatted >= 10 ? formatted.toFixed(0) : formatted.toFixed(1).replace(".0", "");
  return `${compact.replace(".", ",")}${unit.suffix}`;
}
