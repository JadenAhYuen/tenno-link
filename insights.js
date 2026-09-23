/* Pure, local calculations. Missing counters deliberately remain unknown. */
(function (root) {
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const ratio = (a, b) => a !== null && b !== null && b > 0 ? a / b : null;
  function career(summary = {}) {
    const completed = number(summary.missionsCompleted);
    const hours = number(summary.timePlayedSec);
    const solved = number(summary.ciphersSolved);
    const failed = number(summary.ciphersFailed);
    return {
      missionsPerHour: ratio(completed, hours === null ? null : hours / 3600),
      cipherSuccess: solved !== null && failed !== null ? ratio(solved, solved + failed) : null,
      cipherSeconds: ratio(number(summary.cipherTime), solved)
    };
  }
  function equipment(rows = [], names = {}, query = '', sort = 'equipTime') {
    const key = ['equipTime', 'kills', 'xp'].includes(sort) ? sort : 'equipTime';
    return rows.map(row => {
      const path = String(row.type || 'Unknown equipment');
      return { ...row, name: names[path] || path.split('/').pop().replace(/([a-z])([A-Z])/g, '$1 $2'),
        resolved: Boolean(names[path]), path };
    }).filter(row => `${row.name} ${row.path}`.toLowerCase().includes(query.toLowerCase().trim()))
      .sort((a, b) => (number(b[key]) ?? -1) - (number(a[key]) ?? -1) || a.name.localeCompare(b.name));
  }
  root.TennoInsights = { number, career, equipment };
})(globalThis);
