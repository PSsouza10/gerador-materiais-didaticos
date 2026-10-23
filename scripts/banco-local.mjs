// Preload para teste ponta a ponta no computador (NUNCA em produção):
//   PG_LOCAL_URL=postgres://... PG_MODULO=/caminho/node_modules/pg/lib/index.js BANCO_LOCAL=1 \
//   NODE_OPTIONS="--import ./scripts/banco-local.mjs" npx next start
// Põe um cliente Postgres comum em globalThis.__edugeraBancoLocal (lib/banco.js só usa fora da produção).
if (process.env.BANCO_LOCAL === "1" && process.env.VERCEL_ENV !== "production" && process.env.PG_LOCAL_URL && process.env.PG_MODULO) {
  const pg = (await import(process.env.PG_MODULO)).default;
  const pool = new pg.Pool({ connectionString: process.env.PG_LOCAL_URL, max: 4 });
  globalThis.__edugeraBancoLocal = {
    consultar: async (t, p = []) => (await pool.query(t, p)).rows,
    transacao: async (lista) => {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const r = [];
        for (const [t, p = []] of lista) r.push((await c.query(t, p)).rows);
        await c.query("COMMIT");
        return r;
      } catch (e) {
        await c.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    },
  };
}
