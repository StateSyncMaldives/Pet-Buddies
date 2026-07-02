export interface DbMigration {
  id: string
  filename: string
  sql: string
}

export interface DbClient {
  execute(sql: string): void | Promise<void>
}
