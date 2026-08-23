/* Least-squares helpers used by every dimensional fit. */

export function linearFit(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: n === 1 ? ys[0] : 0, n };
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxx += xs[i] * xs[i];
    sxy += xs[i] * ys[i];
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-15) return { slope: 0, intercept: sy / n, n };
  const slope = (n * sxy - sx * sy) / denom;
  return { slope, intercept: (sy - slope * sx) / n, n };
}

/* Fit log(y) = slope*log(x) + intercept over strictly positive samples. */
export function logLogFit(xs, ys) {
  const lx = [],
    ly = [];
  for (let i = 0; i < xs.length; i++) {
    if (xs[i] > 0 && ys[i] > 0) {
      lx.push(Math.log(xs[i]));
      ly.push(Math.log(ys[i]));
    }
  }
  return linearFit(lx, ly);
}

export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function variance(a) {
  const m = mean(a);
  return a.length ? mean(a.map((x) => (x - m) ** 2)) : 0;
}

export function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs),
    my = mean(ys);
  let cov = 0,
    vx = 0,
    vy = 0;
  for (let i = 0; i < n; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    vx += (xs[i] - mx) ** 2;
    vy += (ys[i] - my) ** 2;
  }
  return vx * vy > 0 ? cov / Math.sqrt(vx * vy) : 0;
}
