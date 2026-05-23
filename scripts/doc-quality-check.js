import { existsSync, readFileSync, readdirSync } from 'fs';
import { extname, join, relative } from 'path';

const DOCS_DIR = join(process.cwd(), 'docs');
const ROOT_DIR = process.cwd();

const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const CYAN = '\x1b[0;36m';
const NC = '\x1b[0m';

const CORE_DOCS = [
  'docs/core/README.md',
  'docs/core/DEVELOPMENT_GUIDE.md',
  'docs/core/API_DOCUMENTATION.md',
  'docs/core/ARCHITECTURE_DECISIONS.md',
  'docs/core/CHANGELOG.md',
  'docs/core/SECURITY_GUIDE.md',
  'docs/core/CONTRIBUTING.md',
  'docs/core/FAQ.md',
  'docs/core/DOCUMENTATION_STANDARDS.md',
];

const EXTENDED_DOCS = ['docs/extended/DEPLOYMENT_GUIDE.md', 'docs/extended/INTERNATIONALIZATION.md'];

const REQUIRED_SECTIONS = {
  'API_DOCUMENTATION.md': ['认证', '错误', 'RESTful', 'WebSocket'],
  'DEPLOYMENT_GUIDE.md': ['Docker', '环境变量', '数据库', '故障'],
  'SECURITY_GUIDE.md': ['认证', '加密', '漏洞', '审计'],
  'CONTRIBUTING.md': ['Pull Request', '代码规范', 'Commit', '测试'],
  'FAQ.md': ['常见', '部署', 'API', 'AI'],
};

const FORBIDDEN_PATTERNS = [{ pattern: /TODO:|FIXME:|HACK:|XXX:/g, label: 'TODO/FIXME marker' }];

const MAX_LINE_LENGTH = 200;
const MIN_DOC_LINES = 50;

let totalScore = 0;
let maxScore = 0;
let errors = 0;
let warnings = 0;

function score(points, max, level = 'info') {
  totalScore += points;
  maxScore += max;
  return { points, max, level };
}

function getAllMdFiles(dir) {
  let results = [];
  if (!existsSync(dir)) return results;

  const items = readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getAllMdFiles(fullPath));
    } else if (extname(item.name) === '.md') {
      results.push(fullPath);
    }
  }
  return results;
}

function checkCoreDocs() {
  console.log(`\n${CYAN}━━━ 1. 核心文档完整性检查 ━━━${NC}`);
  console.log('─'.repeat(50));

  for (const docPath of CORE_DOCS) {
    const fullPath = join(ROOT_DIR, docPath);
    const fileName = docPath.split('/').pop();

    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').length;

      if (lines >= MIN_DOC_LINES) {
        console.log(`${GREEN}✅${NC} ${fileName} (${lines} lines)`);
        score(10, 10);
      } else {
        console.log(`${YELLOW}⚠️${NC} ${fileName} 内容过少 (${lines}/${MIN_DOC_LINES} lines)`);
        score(5, 10);
        warnings++;
      }
    } else {
      console.log(`${RED}❌${NC} ${fileName} 缺失`);
      score(0, 10);
      errors++;
    }
  }

  for (const docPath of EXTENDED_DOCS) {
    const fullPath = join(ROOT_DIR, docPath);
    const fileName = docPath.split('/').pop();

    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n').length;
      console.log(`${GREEN}✅${NC} ${fileName} (${lines} lines)`);
      score(5, 5);
    } else {
      console.log(`${YELLOW}⚠️${NC} ${fileName} 缺失 (扩展文档)`);
      score(0, 5);
      warnings++;
    }
  }
}

function checkRequiredSections() {
  console.log(`\n${CYAN}━━━ 2. 必要章节检查 ━━━${NC}`);
  console.log('─'.repeat(50));

  for (const [docName, keywords] of Object.entries(REQUIRED_SECTIONS)) {
    const fullPath = join(ROOT_DIR, 'docs/core', docName);

    if (!existsSync(fullPath)) continue;

    const content = readFileSync(fullPath, 'utf-8');
    const missing = keywords.filter((kw) => !content.includes(kw));

    if (missing.length === 0) {
      console.log(`${GREEN}✅${NC} ${docName}: 所有必要章节完整`);
      score(10, 10);
    } else {
      console.log(`${YELLOW}⚠️${NC} ${docName}: 缺少关键词 [${missing.join(', ')}]`);
      score(10 - missing.length * 2, 10);
      warnings++;
    }
  }
}

function stripCodeBlocks(content) {
  return content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '')
}

function checkLinks() {
  console.log(`\n${CYAN}━━━ 3. 内部链接有效性 ━━━${NC}`);
  console.log('─'.repeat(50));

  const mdFiles = getAllMdFiles(DOCS_DIR);
  mdFiles.push(join(ROOT_DIR, 'README.md'));
  mdFiles.push(join(ROOT_DIR, 'README.en.md'));

  const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
  let totalLinks = 0;
  let brokenLinks = 0;
  const seenBroken = new Set()

  for (const filePath of mdFiles) {
    const rawContent = readFileSync(filePath, 'utf-8');
    const content = stripCodeBlocks(rawContent);
    const relativePath = relative(ROOT_DIR, filePath);
    let match;

    while ((match = linkPattern.exec(content)) !== null) {
      const [_, text, href] = match;

      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) continue;

      totalLinks++;

      const linkRef = href.split('#')[0]
      if (!linkRef) continue

      const resolvedPath = join(filePath, '..', linkRef);

      if (!existsSync(resolvedPath)) {
        const key = `${relativePath}→${href}`
        if (!seenBroken.has(key)) {
          seenBroken.add(key)
          console.log(`${RED}❌${NC} ${relativePath}: [${text}] → ${href}`);
        }
        brokenLinks++;
      }
    }
  }

  if (brokenLinks === 0) {
    console.log(`${GREEN}✅${NC} 所有 ${totalLinks} 个内部链接有效`);
    score(15, 15);
  } else {
    console.log(`${RED}❌${NC} ${brokenLinks}/${totalLinks} 个链接失效`);
    score(Math.max(0, 15 - brokenLinks * 3), 15);
    errors += brokenLinks;
  }
}

function checkSecurityPatterns() {
  console.log(`\n${CYAN}━━━ 4. 安全内容检查 ━━━${NC}`);
  console.log('─'.repeat(50));

  const mdFiles = getAllMdFiles(DOCS_DIR);
  let issuesFound = 0;

  for (const filePath of mdFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = relative(ROOT_DIR, filePath);

    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        for (const _ of matches) {
          console.log(`${RED}🚨${NC} ${relativePath}: 发现 ${label}`);
          issuesFound++;
        }
      }
    }
  }

  if (issuesFound === 0) {
    console.log(`${GREEN}✅${NC} 未发现敏感信息泄露`);
    score(10, 10);
  } else {
    console.log(`${RED}🚨${NC} 发现 ${issuesFound} 处潜在安全问题`);
    score(Math.max(0, 10 - issuesFound * 5), 10);
    errors += issuesFound;
  }
}

function checkFormatting() {
  console.log(`\n${CYAN}━━━ 5. 格式规范检查 ━━━${NC}`);
  console.log('─'.repeat(50));

  const mdFiles = getAllMdFiles(DOCS_DIR);
  mdFiles.push(join(ROOT_DIR, 'README.md'));
  mdFiles.push(join(ROOT_DIR, 'README.en.md'));

  let longLines = 0;
  let missingNewline = 0;
  let duplicateHeadings = 0;

  for (const filePath of mdFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = relative(ROOT_DIR, filePath);
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > MAX_LINE_LENGTH) longLines++;
    }

    if (!content.endsWith('\n')) {
      missingNewline++;
      console.log(`${YELLOW}⚠️${NC} ${relativePath}: 文件末尾缺少换行符`);
    }

    const headings = content.match(/^#{1,6}\s+.+$/gm) || [];
    const headingTexts = headings.map((h) => h.replace(/^#+\s+/, ''));
    const duplicates = headingTexts.filter((h, i) => headingTexts.indexOf(h) !== i);
    if (duplicates.length > 0) {
      duplicateHeadings += duplicates.length;
      console.log(`${YELLOW}⚠️${NC} ${relativePath}: ${duplicates.length} 个重复标题`);
    }
  }

  if (longLines > 0) {
    console.log(`${YELLOW}⚠️${NC} ${longLines} 行超过 ${MAX_LINE_LENGTH} 字符`);
    warnings += longLines;
  }

  if (longLines === 0 && missingNewline === 0 && duplicateHeadings === 0) {
    console.log(`${GREEN}✅${NC} 格式规范检查通过`);
    score(10, 10);
  } else {
    score(Math.max(0, 10 - (longLines * 0.1 + missingNewline + duplicateHeadings)), 10);
  }
}

function checkStructure() {
  console.log(`\n${CYAN}━━━ 6. 文档结构检查 ━━━${NC}`);
  console.log('─'.repeat(50));

  const expectedDirs = ['core', 'extended'];
  for (const dir of expectedDirs) {
    const dirPath = join(DOCS_DIR, dir);
    if (existsSync(dirPath)) {
      const files = getAllMdFiles(dirPath);
      console.log(`${GREEN}✅${NC} docs/${dir}/ (${files.length} markdown files)`);
      score(5, 5);
    } else {
      console.log(`${RED}❌${NC} docs/${dir}/ 目录缺失`);
      score(0, 5);
      errors++;
    }
  }

  const readmePath = join(ROOT_DIR, 'README.md');
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, 'utf-8');

    const hasQuickStart = readme.includes('快速开始') || readme.includes('Quick Start');
    const hasDocNav = readme.includes('文档导航') || readme.includes('Documentation');
    const hasContributing = readme.includes('贡献') || readme.includes('Contributing');

    if (hasQuickStart && hasDocNav && hasContributing) {
      console.log(`${GREEN}✅${NC} README.md 结构完整`);
      score(10, 10);
    } else {
      const missing = [];
      if (!hasQuickStart) missing.push('快速开始');
      if (!hasDocNav) missing.push('文档导航');
      if (!hasContributing) missing.push('贡献指南');
      console.log(`${YELLOW}⚠️${NC} README.md 缺少: ${missing.join(', ')}`);
      score(5, 10);
      warnings++;
    }
  }
}

function generateReport() {
  console.log(`\n${CYAN}━━━ 检查报告汇总 ━━━${NC}`);
  console.log('━'.repeat(50));

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : 'F';

  const gradeColor =
    grade === 'A' ? GREEN : grade === 'B' ? GREEN : grade === 'C' ? YELLOW : grade === 'D' ? YELLOW : RED;

  console.log(`\n📊 得分: ${totalScore}/${maxScore} (${percentage}%)`);
  console.log(`📈 等级: ${gradeColor}${grade}${NC}`);
  console.log(`❌ 错误: ${errors}`);
  console.log(`⚠️  警告: ${warnings}`);

  console.log(`\n${'─'.repeat(50)}`);

  if (errors > 0) {
    console.log(`${RED}\n⛔ 发现 ${errors} 个错误，请修复后重新检查${NC}`);
    process.exit(1);
  } else if (warnings > 5) {
    console.log(`${YELLOW}\n⚠️  发现 ${warnings} 个警告，建议优化${NC}`);
    process.exit(0);
  } else {
    console.log(`${GREEN}\n✅ 文档质量检查通过！${NC}`);
    process.exit(0);
  }
}

console.log(`${CYAN}\n📋 YYC³ AI Family - 文档质量自动检查${NC}`);
console.log('━'.repeat(50));
console.log(`📅 ${new Date().toISOString().split('T')[0]}`);
console.log(`📂 docs/ directory: ${DOCS_DIR}`);

checkCoreDocs();
checkRequiredSections();
checkLinks();
checkSecurityPatterns();
checkFormatting();
checkStructure();
generateReport();
