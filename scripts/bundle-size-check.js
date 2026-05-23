import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const DIST_DIR = join(process.cwd(), 'dist')

const SIZE_THRESHOLDS = {
  'warning': 200 * 1024,   // 200KB
  'error': 500 * 1024,     // 500KB
}

const TOTAL_THRESHOLD = 2 * 1024 * 1024 // 2MB total

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFiles(dir, baseDir = dir) {
  let results = []
  const items = readdirSync(dir, { withFileTypes: true })
  
  for (const item of items) {
    const fullPath = join(dir, item.name)
    if (item.isDirectory()) {
      results = results.concat(getFiles(fullPath, baseDir))
    } else {
      const stat = statSync(fullPath)
      const relativePath = fullPath.replace(baseDir + '/', '')
      results.push({
        path: relativePath,
        size: stat.size,
      })
    }
  }
  
  return results.sort((a, b) => b.size - a.size)
}

function checkBundleSize() {
  console.log('\n📊 YYC3 Bundle Size Analysis')
  console.log('━'.repeat(50))

  try {
    const files = getFiles(DIST_DIR)
    
    if (files.length === 0) {
      console.log('\n⚠️  No build artifacts found. Run "npm run build" first.')
      process.exit(1)
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    const jsFiles = files.filter(f => f.path.endsWith('.js'))
    const cssFiles = files.filter(f => f.path.endsWith('.css'))

    console.log(`\n📁 Total Files: ${files.length}`)
    console.log(`📦 Total Size: ${formatBytes(totalSize)}`)
    console.log(`📜 JS Files: ${jsFiles.length} (${formatBytes(jsFiles.reduce((s, f) => s + f.size, 0))})`)
    console.log(`🎨 CSS Files: ${cssFiles.length} (${formatBytes(cssFiles.reduce((s, f) => s + f.size, 0))})`)

    console.log('\n' + '━'.repeat(50))
    console.log('\n🔍 Largest Files:')
    console.log('─'.repeat(50))

    let hasWarnings = false
    let hasErrors = false

    for (const file of files.slice(0, 15)) {
      const icon = file.size > SIZE_THRESHOLDS.error 
        ? '❌' 
        : file.size > SIZE_THRESHOLDS.warning 
          ? '⚠️' 
          : '✅'
      
      if (file.size > SIZE_THRESHOLDS.error) hasErrors = true
      else if (file.size > SIZE_THRESHOLDS.warning) hasWarnings = true

      console.log(`${icon} ${formatBytes(file.size).padStart(10)}  ${file.path}`)
    }

    console.log('\n' + '━'.repeat(50))

    if (totalSize > TOTAL_THRESHOLD) {
      console.log(`\n❌ ERROR: Total bundle size (${formatBytes(totalSize)}) exceeds threshold (${formatBytes(TOTAL_THRESHOLD)})`)
      hasErrors = true
    } else {
      console.log(`\n✅ Total size within threshold (${formatBytes(totalSize)} < ${formatBytes(TOTAL_THRESHOLD)})`)
    }

    console.log('\n📈 Size Thresholds:')
    console.log(`   Warning: > ${formatBytes(SIZE_THRESHOLDS.warning)} per file`)
    console.log(`   Error:    > ${formatBytes(SIZE_THRESHOLDS.error)} per file`)
    console.log(`   Total:    < ${formatBytes(TOTAL_THRESHOLD)} combined`)

    if (hasErrors) {
      console.log('\n💥 Bundle size check FAILED!')
      process.exit(1)
    } else if (hasWarnings) {
      console.log('\n⚠️  Bundle size check PASSED with warnings')
      process.exit(0)
    } else {
      console.log('\n✨ Bundle size check PASSED!')
      process.exit(0)
    }

  } catch (error) {
    console.error('\n❌ Error analyzing bundle:', error.message)
    process.exit(1)
  }
}

checkBundleSize()
