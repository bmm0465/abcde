/** 클래스 이름 결합. falsy 는 버린다. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
