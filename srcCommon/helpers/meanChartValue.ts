export function meanChartValue (histData: { v: number[], c: number[] }, limitXi: number, limitXf: number, limTmin?: number, limTmax?: number) {
  if (!histData) return {};
  const { c, v } = histData;
  let acc = 0;
  let count = 0;
  let max = null;
  let min = null;
  let xi = 0;
  let xf = 0;
  let tAcima = 0;
  let tAbaixo = 0;
  for (let i = 0; i < c.length; i++) {
    xi = xf;
    xf += c[i];
    if (v[i] == null) continue;
    let desconto = 0;
    if (limitXi != null) {
      if (xf < limitXi) continue;
      if (xi > limitXi) { } // OK
      else { desconto += limitXi - xi; }
    }
    if (limitXf != null) {
      if (xi > limitXf) continue;
      if (xf < limitXf) { } // OK
      else { desconto += xf - limitXf; }
    }
    acc += v[i] * (c[i] - desconto);
    count += (c[i] - desconto);
    if (max == null || v[i] > max) { max = v[i]; }
    if (min == null || v[i] < min) { min = v[i]; }
    if ((limTmin != null) && (v[i] < limTmin)) tAbaixo += (c[i] - desconto);
    if ((limTmax != null) && (v[i] > limTmax)) tAcima += (c[i] - desconto);
  }
  let med = null;
  if (count > 0) {
    med = Math.round(acc / count * 10) / 10;
  }
  return { med, max, min, tAcima, tAbaixo };
}
