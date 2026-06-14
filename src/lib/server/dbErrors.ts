// A table can be reported missing two ways depending on the path: Postgres
// raises 42P01 (undefined_table), while PostgREST's schema cache returns
// PGRST205. Treat both as "table not created yet".
export function isMissingTableError(error: { code?: string } | null | undefined): boolean {
  return error?.code === '42P01' || error?.code === 'PGRST205'
}
