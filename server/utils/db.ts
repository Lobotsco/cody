import pg from 'pg'
import type { PoolClient, QueryResult, QueryResultRow } from 'pg'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getDbPool(): pg.Pool {
  if (!pool) {
    const config = useRuntimeConfig()
    const host = process.env.DB_HOST || config.dbHost || '127.0.0.1'
    const port = Number(process.env.DB_PORT || config.dbPort || 5432)
    const database = process.env.DB_NAME || config.dbName || 'cody'
    const user = process.env.DB_USER || config.dbUser || 'usrcody'
    const password = process.env.DB_PASSWORD || config.dbPassword || ''

    pool = new Pool({
      host,
      port,
      database,
      user,
      password,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })

    pool.on('error', (err) => {
      console.error('[cody:db] Error inesperado en el pool de PostgreSQL:', err)
    })
  }
  return pool
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return getDbPool().query<T>(text, params)
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDbPool().connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
