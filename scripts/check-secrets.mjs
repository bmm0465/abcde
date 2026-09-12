// 공개 저장소 방어선. git 이 추적하는 파일에서 비밀값·개인정보처럼 보이는 것을 찾는다.
// 사용법: npm run check:secrets   (CI 에서도 돈다)

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const SECRET_PATTERNS = [
  { name: 'OpenAI 키', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: 'Anthropic 키', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'JWT(Supabase 키 등)', re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/ },
  { name: 'Supabase 서비스 키 대입', re: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"]?[A-Za-z0-9_.-]{20,}/ },
  { name: 'AWS 액세스 키', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Google API 키', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: '개인 키 블록', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
]

// 데이터 파일(표·문서)의 이름에 명단·계정·비밀번호가 들어가면 개인정보 파일로 본다. 소스 코드 경로는 해당 없음.
const DATA_EXT = /\.(csv|xlsx|xls|tsv|txt|json|sql|docx|md)$/i
const PII_NAME = /(계정|명단|비밀번호|password|roster|accounts-)/i
const BINARY_EXT = /\.(png|jpg|jpeg|gif|webp|ico|mp3|wav|pdf|woff2?|ttf|zip)$/i
const SKIP = /^(package-lock\.json|scripts\/check-secrets\.mjs)$/

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean)
const problems = []

for (const file of files) {
  if (SKIP.test(file)) continue
  const basename = file.split('/').pop() ?? file
  if (DATA_EXT.test(basename) && PII_NAME.test(basename)) {
    problems.push(`${file}: 파일 이름이 개인정보 파일처럼 보입니다.`)
  }
  if (BINARY_EXT.test(file)) continue
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  for (const { name, re } of SECRET_PATTERNS) {
    if (re.test(text)) problems.push(`${file}: ${name} 로 보이는 값이 있습니다.`)
  }
}

if (problems.length > 0) {
  console.error('✗ 커밋하면 안 되는 것이 있습니다:\n' + problems.map((p) => `  - ${p}`).join('\n'))
  process.exit(1)
}
console.log(`✓ ${files.length}개 파일 검사. 비밀값·개인정보 파일 없음.`)
