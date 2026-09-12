/**
 * 사이트 정체성. 문구는 bmm0465.github.io 에서 가져왔다.
 */
export const site = {
  name: 'ABCDE Projects',
  shortName: 'ABCDE',
  tagline: 'A Better Class: Data & Education',
  headline: '데이터로 그리는 더 나은 교실',
  description:
    '초등 교사의 직관과 데이터 사이언스의 정밀함이 만나 교육 현장의 난제들을 해결해 나가는 과정을 기록합니다.',
  author: {
    name: 'Debussy',
    github: 'https://github.com/bmm0465',
  },
  /** 공개할 문의 이메일. 비워 두면 문의 화면에 표시하지 않는다. */
  contactEmail: '',
  legacySite: 'https://bmm0465.github.io/',
  nav: [
    { href: '/projects', label: '프로젝트' },
    { href: '/notes', label: '기록' },
    { href: '/about', label: '소개' },
  ],
} as const
