import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, relative, extname } from 'path'

const ROOT_DIR = process.cwd()
const DOCS_DIR = join(ROOT_DIR, 'docs')

const RED = '\x1b[0;31m'
const GREEN = '\x1b[0;32m'
const YELLOW = '\x1b[1;33m'
const CYAN = '\x1b[0;36m'
const NC = '\x1b[0m'

function getAllMdFiles(dir) {
  let results = []
  if (!existsSync(dir)) return results

  const items = readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fullPath = join(dir, item.name)
    if (item.isDirectory()) {
      results = results.concat(getAllMdFiles(fullPath))
    } else if (extname(item.name) === '.md') {
      results.push(fullPath)
    }
  }
  return results
}

function stripCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')
}

function checkLinks() {
  console.log(`${CYAN}\n🔗 YYC³ AI Family - 文档链接有效性检查${NC}`)
  console.log('━'.repeat(60))
  console.log(`📅 ${new Date().toISOString().split('T')[0]}\n`)

  const scanDirs = [
    DOCS_DIR,
    ROOT_DIR,
  ]

  const mdFiles = []
  for (const dir of scanDirs) {
    if (dir === ROOT_DIR) {
      const readme = join(ROOT_DIR, 'README.md')
      const readmeEn = join(ROOT_DIR, 'README.en.md')
      if (existsSync(readme)) mdFiles.push(readme)
      if (existsSync(readmeEn)) mdFiles.push(readmeEn)
    } else {
      mdFiles.push(...getAllMdFiles(dir))
    }
  }

  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g
  let totalLinks = 0
  let internalLinks = 0
  let externalLinks = 0
  let brokenLinks = 0
  let validLinks = 0
  const brokenDetails = []

  for (const filePath of mdFiles) {
    const rawContent = readFileSync(filePath, 'utf-8')
    const content = stripCodeBlocks(rawContent)
    const relativePath = relative(ROOT_DIR, filePath)
    let match

    linkPattern.lastIndex = 0

    while ((match = linkPattern.exec(content)) !== null) {
      const [_, text, href] = match
      totalLinks++

      if (href.startsWith('http://') || href.startsWith('https://')) {
        externalLinks++
        continue
      }

      if (href.startsWith('#') || href.startsWith('mailto:')) {
        continue
      }

      internalLinks++

      const linkRef = href.split('#')[0]
      if (!linkRef) {
        validLinks++
        continue
      }

      const resolvedPath = join(filePath, '..', linkRef)

      if (existsSync(resolvedPath)) {
        validLinks++
      } else {
        brokenLinks++
        brokenDetails.push({
          file: relativePath,
          text,
          href,
        })
      }
    }
  }

  console.log(`${CYAN}📊 链接统计${NC}`)
  console.log('─'.repeat(40))
  console.log(`📄 扫描文件: ${mdFiles.length} markdown files`)
  console.log(`🔗 总链接数: ${totalLinks}`)
  console.log(`   ├─ 内部链接: ${internalLinks}`)
  console.log(`   ├─ 外部链接: ${externalLinks}`)
  console.log(`   ├─ 有效链接: ${GREEN}${validLinks}${NC}`)
  console.log(`   └─ 失效链接: ${brokenLinks > 0 ? RED : GREEN}${brokenLinks}${NC}`)

  if (brokenDetails.length > 0) {
    console.log(`\n${RED}❌ 失效链接详情${NC}`)
    console.log('─'.repeat(60))

    const byFile = {}
    for (const detail of brokenDetails) {
      if (!byFile[detail.file]) byFile[detail.file] = []
      byFile[detail.file].push(detail)
    }

    for (const [file, links] of Object.entries(byFile)) {
      console.log(`\n${YELLOW}${file}${NC}`)
      for (const link of links) {
        console.log(`  ${RED}→${NC} [${link.text}] → ${link.href}`)
      }
    }
  }

  console.log(`\n${'━'.repeat(60)}`)

  if (brokenLinks === 0) {
    console.log(`${GREEN}\n✅ 所有 ${internalLinks} 个内部链接均有效！${NC}`)
    process.exit(0)
  } else {
    console.log(`${RED}\n❌ 发现 ${brokenLinks} 个失效链接，请修复${NC}`)
    process.exit(1)
  }
}

checkLinks()
