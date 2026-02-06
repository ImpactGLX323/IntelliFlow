import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const outPath = path.resolve(process.cwd(), 'firebase.config.json')

const parseEnv = (content) =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((acc, line) => {
      const idx = line.indexOf('=')
      if (idx === -1) return acc
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
      acc[key] = value
      return acc
    }, {})

const env = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {}

const config = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

fs.writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`)
