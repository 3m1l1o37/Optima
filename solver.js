'use strict';

const EPS = 1e-9;
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);
const zeroes = n => Array(n).fill(0);
const unit = (n, index) => zeroes(n).map((_, i) => Number(i === index));
const close = (a, b) => a === b || Number.isFinite(a) && Number.isFinite(b) &&
  Math.abs(a - b) <= 1e-8 + 32 * Number.EPSILON * Math.max(Math.abs(a), Math.abs(b));

function simplex(model, trace = false) {
  const n = model.c.length;
  const labels = model.labels.slice();
  const artificial = new Set();
  const basis = [];
  const history = [];
  const rows = model.rows.map(({a, op, b}, i) => {
    const sign = b < 0 ? -1 : 1;
    const row = a.map(x => sign * x);
    const relation = sign > 0 || op === '=' ? op : op === '≤' ? '≥' : '≤';
    const fill = (label, coefficient) => {
      row[labels.length] = coefficient;
      labels.push(label);
      return labels.length - 1;
    };
    if (relation === '≤') {
      basis.push(fill('h' + (i + 1), 1));
    } else {
      if (relation === '≥') fill('e' + (i + 1), -1);
      const index = fill('a' + (i + 1), 1);
      artificial.add(index);
      basis.push(index);
    }
    return {row, b: sign * b};
  });

  const width = labels.length;
  const matrix = rows.map(({row, b}) => [...Array.from({length:width}, (_, j) => row[j] ?? 0), b]);
  const all = labels.map((_, i) => i);
  const real = all.filter(j => !artificial.has(j));

  const pivot = (r, s) => {
    const divisor = matrix[r][s];
    matrix[r] = matrix[r].map(x => x / divisor);
    for (let i = 0; i < matrix.length; i++) {
      if (i === r) continue;
      const multiplier = matrix[i][s];
      matrix[i] = matrix[i].map((x, j) => x - multiplier * matrix[r][j]);
      matrix[i][s] = 0;
    }
    matrix[r][s] = 1;
    basis[r] = s;
  };

  const currentPoint = () => {
    const point = zeroes(n);
    basis.forEach((index, i) => {
      if (index < n) point[index] = Math.max(0, matrix[i][width]);
    });
    return point;
  };

  const reducedCosts = costs => all.map(j => costs[j] -
    basis.reduce((total, col, i) => total + costs[col] * matrix[i][j], 0));

  const snapshot = (phase, available, costs, description) => {
    if (!trace || history.length >= 80) return;
    const value = basis.reduce((total, col, i) => total + costs[col] * matrix[i][width], 0);
    history.push({
      phase, description, value,
      columns:available.map(j => labels[j]),
      basis:basis.map(j => labels[j]),
      matrix:matrix.map(row => [...available.map(j => row[j]), row[width]]),
      reduced:reducedCosts(costs).filter((_, j) => available.includes(j))
    });
  };

  const optimize = (phase, available, costs) => {
    snapshot(phase, available, costs, 'Tabla inicial');
    for (let k = 0; k < 3000; k++) {
      const reduced = reducedCosts(costs);
      const entering = available.find(j => reduced[j] > EPS && !basis.includes(j));
      if (entering === undefined) return {status:'optimal'};
      let leaving = -1;
      let ratio = Infinity;
      matrix.forEach((row, i) => {
        if (row[entering] <= EPS) return;
        const candidate = Math.max(0, row[width]) / row[entering];
        if (candidate < ratio - EPS || (Math.abs(candidate - ratio) <= EPS && basis[i] < basis[leaving])) {
          ratio = candidate;
          leaving = i;
        }
      });
      if (leaving < 0) {
        const direction = zeroes(n);
        basis.forEach((j, i) => { if (j < n) direction[j] = -matrix[i][entering]; });
        if (entering < n) direction[entering] = 1;
        return {status:'unbounded', x:currentPoint(), direction};
      }
      const previous = labels[basis[leaving]];
      pivot(leaving, entering);
      snapshot(phase, available, costs, 'Entra ' + labels[entering] + ', sale ' + previous);
    }
    return {status:'limit'};
  };

  if (artificial.size) {
    const first = optimize(1, all, all.map(j => artificial.has(j) ? -1 : 0));
    if (first.status !== 'optimal') return {status:'limit', history};
    if (basis.some((j, i) => artificial.has(j) && matrix[i][width] > 1e-7)) {
      return {status:'infeasible', history};
    }
    for (let i = matrix.length - 1; i >= 0; i--) {
      if (!artificial.has(basis[i])) continue;
      const j = real.find(col => !basis.includes(col) && Math.abs(matrix[i][col]) > EPS);
      matrix[i][width] = 0;
      if (j !== undefined) pivot(i, j);
      else {
        matrix.splice(i, 1);
        basis.splice(i, 1);
      }
    }
  }

  const sense = model.sense === 'max' ? 1 : -1;
  const second = optimize(2, real, all.map(j => j < n ? sense * model.c[j] : 0));
  if (second.status !== 'optimal') return {...second, history};
  const x = currentPoint();
  return {status:'optimal', x, z:dot(model.c, x), history};
}

function optimalRanges(model, result) {
  const rows = [...model.rows, {a:model.c, op:'=', b:result.z}];
  return model.c.map((_, j) => {
    const probe = {...model, c:unit(model.c.length, j), rows};
    const min = simplex({...probe, sense:'min'});
    const max = simplex({...probe, sense:'max'});
    return [min.status === 'optimal' ? min.z : NaN,
      max.status === 'optimal' ? max.z : max.status === 'unbounded' ? Infinity : NaN];
  });
}

function halfPlanes(rows) {
  return rows.flatMap(({a, op, b}) => {
    const opposite = {a:a.map(x => -x), b:-b};
    return op === '=' ? [{a,b}, opposite] : op === '≤' ? [{a,b}] : [opposite];
  });
}

function vertices(model) {
  const planes = [...halfPlanes(model.rows), {a:[-1,0],b:0}, {a:[0,-1],b:0}];
  const points = [];
  for (let i = 0; i < planes.length; i++) {
    const {a:[a,b],b:e} = planes[i];
    for (let j = i + 1; j < planes.length; j++) {
      const {a:[c,d],b:f} = planes[j];
      const determinant = a*d - b*c;
      if (Math.abs(determinant) <= EPS * Math.hypot(a,b) * Math.hypot(c,d)) continue;
      const point = [(e*d-b*f)/determinant, (a*f-e*c)/determinant];
      if (planes.every(p => dot(p.a, point) <= p.b + 1e-7 * Math.max(1, Math.abs(p.b))) &&
          !points.some(p => p.every((x,k) => close(x,point[k])))) points.push(point.map(x => Math.max(0,x)));
    }
  }
  return points.sort((a,b) => a[0]-b[0] || a[1]-b[1]);
}

function clipPolygon(points, planes) {
  for (const {a,b} of planes) {
    const clipped = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const q = points[(i + 1) % points.length];
      const dp = dot(a,p) - b;
      const dq = dot(a,q) - b;
      const pIn = dp <= 1e-8;
      const qIn = dq <= 1e-8;
      if (pIn) clipped.push(p);
      if (pIn !== qIn) {
        const t = Math.min(1, Math.max(0, dp / (dp - dq)));
        clipped.push(p.map((x,j) => x + t * (q[j]-x)));
      }
    }
    points = clipped;
  }
  return points;
}
