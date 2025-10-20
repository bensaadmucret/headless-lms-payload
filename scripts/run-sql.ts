/**
 * Script pour exécuter du SQL directement sur la base de données
 */

import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runSQL() {
  const client = new Client({
    connectionString: process.env.DATABASE_URI,
  })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected')

    const sqlPath = path.join(__dirname, 'fix-import-jobs.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    console.log('📝 Executing SQL script...')
    await client.query(sql)
    console.log('✅ SQL script executed successfully')

    console.log('🎉 Database fixed!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await client.end()
    process.exit(0)
  }
}

runSQL()
