/** KST 기준 달의 첫날(YYYY-MM-01). usage_monthly.month 와 비교한다. offset = -1 이면 지난 달. */
export function kstMonthStart(offsetMonths = 0): string {
  const kst = new Date(Date.now() + 9 * 3600 * 1000)
  return new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() + offsetMonths, 1)).toISOString().slice(0, 10)
}
