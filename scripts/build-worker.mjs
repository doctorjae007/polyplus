import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

await mkdir('dist/server', { recursive: true })
await mkdir('dist/.openai', { recursive: true })
await copyFile('.openai/hosting.json', 'dist/.openai/hosting.json')
const workerSource = await readFile('worker/index.js', 'utf8')
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' }
const assets = []
const collect = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'server' || entry.name === '.openai') continue
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) await collect(fullPath)
    else {
      const urlPath = `/${relative('dist', fullPath).replaceAll('\\', '/')}`
      const mime = mimeTypes[extname(entry.name).toLowerCase()] ?? 'application/octet-stream'
      const content = await readFile(fullPath)
      assets.push([urlPath, { body: content.toString('base64'), mime }])
    }
  }
}
await collect('dist')
const embedded = `const EMBEDDED_ASSETS = new Map(${JSON.stringify(assets)})\n`
await writeFile('dist/server/index.js', embedded + workerSource)
