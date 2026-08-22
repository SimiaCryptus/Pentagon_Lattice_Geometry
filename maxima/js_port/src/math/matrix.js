/* Small dense-matrix helpers: symmetric eigenvalues (Jacobi), 2x2 PF. */

export function zeros(n, m = n) {
  return Array.from({ length: n }, () => new Float64Array(m));
}

export function identity(n) {
  const A = zeros(n);
  for (let i = 0; i < n; i++) A[i][i] = 1;
  return A;
}

export function matMul(A, B) {
  const n = A.length, k = B.length, m = B[0].length;
  const C = zeros(n, m);
  for (let i = 0; i < n; i++)
    for (let p = 0; p < k; p++) {
      const a = A[i][p];
      if (!a) continue;
      for (let j = 0; j < m; j++) C[i][j] += a * B[p][j];
    }
  return C;
}

export function trace(A) {
  let t = 0;
  for (let i = 0; i < A.length; i++) t += A[i][i];
  return t;
}

/* Cyclic Jacobi eigenvalue solver for real symmetric matrices. */
export function jacobiEigenvalues(Ain, { maxSweeps = 100, tol = 1e-11 } = {}) {
  const n = Ain.length;
  const A = Ain.map((r) => Float64Array.from(r));
  for (let sweep = 0; sweep < maxSweeps; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (Math.sqrt(2 * off) < tol) break;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p][q];
        if (Math.abs(apq) < 1e-15) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p], akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k], aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
      }
    }
  }
  const eig = [];
  for (let i = 0; i < n; i++) eig.push(A[i][i]);
  return eig.sort((a, b) => a - b);
}

/* Perron-Frobenius eigenvalue of a non-negative 2x2 matrix. */
export function pf2x2(M) {
  const tr = M[0][0] + M[1][1];
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  const disc = tr * tr - 4 * det;
  return disc >= 0 ? (tr + Math.sqrt(disc)) / 2 : tr / 2;
}

export function applyMat2(M, v) {
  return [M[0] * v[0] + M[1] * v[1], M[2] * v[0] + M[3] * v[1]];
}

export function mulMat2(A, B) {
  return [
    A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3],
    A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3],
  ];
}