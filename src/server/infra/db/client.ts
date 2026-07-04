import type { DbClient } from './types'

export function createDbClient(client: DbClient): DbClient {
  return client
}

export function createD1MigrationClient(client: Pick<D1Database, 'prepare'>): DbClient {
  return {
    async execute(sql) {
      for (const statement of splitD1MigrationStatements(sql)) {
        await client.prepare(statement).run()
      }
    },
  }
}

function splitD1MigrationStatements(sql: string): string[] {
  const uncommentedSql = sql
    .split(/\r?\n/)
    .map((line) => (line.trimStart().startsWith('--') ? '' : line))
    .join('\n')

  const statements: string[] = []
  let statement = ''
  let inSingleQuotedString = false

  for (let index = 0; index < uncommentedSql.length; index += 1) {
    const character = uncommentedSql[index]
    const nextCharacter = uncommentedSql[index + 1]

    if (character === "'") {
      statement += character

      if (inSingleQuotedString && nextCharacter === "'") {
        statement += nextCharacter
        index += 1
      } else {
        inSingleQuotedString = !inSingleQuotedString
      }

      continue
    }

    if (character === ';' && !inSingleQuotedString) {
      statements.push(statement)
      statement = ''
      continue
    }

    statement += character
  }

  statements.push(statement)

  return statements
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .filter((statement) => !statement.toUpperCase().startsWith('PRAGMA '))
}
