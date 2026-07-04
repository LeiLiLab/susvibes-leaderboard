// Descending semver-ish sort: "v1.10" > "v1.2" > "v1.0" > "v0.0" (numeric, not string).
export function sortVersionsDesc(list) {
  const parse = (v) => String(v).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0)
  return [...list].sort((a, b) => {
    const pa = parse(a), pb = parse(b)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pb[i] || 0) - (pa[i] || 0)
      if (d) return d
    }
    return 0
  })
}
