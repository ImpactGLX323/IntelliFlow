import fs from 'fs'
import path from 'path'

const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
]
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

const envPath = candidateEnvPaths.find((candidate) => fs.existsSync(candidate))
const env = envPath ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {}

const readConfigValue = (...keys) => {
  for (const key of keys) {
    if (env[key]) {
      return env[key]
    }
  }
  return ''
}

const config = {
  apiKey: readConfigValue('EXPO_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY'),
  authDomain: readConfigValue('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: readConfigValue('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: readConfigValue('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readConfigValue('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readConfigValue('EXPO_PUBLIC_FIREBASE_APP_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID'),
}

fs.writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`)
