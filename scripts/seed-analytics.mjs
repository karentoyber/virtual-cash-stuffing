import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const u = await pool.query('SELECT id FROM "user" WHERE email=$1', [
  'iratest@example.com',
])
if (!u.rows.length) {
  console.log('no user')
  process.exit(0)
}
const userId = u.rows[0].id

await pool.query(
  `INSERT INTO accounts ("userId",name,category,kind,balance) SELECT $1,'Everyday Checking','Checking','asset','4200' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE "userId"=$1 AND name='Everyday Checking')`,
  [userId],
)
await pool.query(
  `INSERT INTO accounts ("userId",name,category,kind,balance,"creditLimit") SELECT $1,'Sapphire Card','Credit Cards','liability','850','10000' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE "userId"=$1 AND name='Sapphire Card')`,
  [userId],
)

const accs = await pool.query(
  'SELECT id,name FROM accounts WHERE "userId"=$1',
  [userId],
)
const checking = accs.rows.find((a) => a.name === 'Everyday Checking').id
const card = accs.rows.find((a) => a.name === 'Sapphire Card').id

await pool.query('DELETE FROM transactions WHERE "userId"=$1', [userId])

const now = new Date()
const y = now.getFullYear()
const m = now.getMonth()
const d = (day) => new Date(y, m, day)
const pd = (day) => new Date(y, m - 1, day)

const rows = [
  [checking, 'inflow', '3200', 'Salary', 'Monthly paycheck', d(2)],
  [checking, 'inflow', '600', 'Side Income', 'Freelance gig', d(10)],
  [checking, 'inflow', '120', 'Refunds', 'Return refund', d(14)],
  [checking, 'outflow', '1450', 'Rent', 'September rent', d(1)],
  [checking, 'outflow', '320', 'Groceries', 'Whole Foods', d(4)],
  [checking, 'outflow', '210', 'Groceries', 'Trader Joes', d(12)],
  [checking, 'outflow', '95', 'Dining', 'Dinner out', d(6)],
  [checking, 'outflow', '140', 'Dining', 'Brunch + lunch', d(15)],
  [checking, 'outflow', '60', 'Transit', 'Gas', d(8)],
  [card, 'outflow', '220', 'Dining', 'Restaurants', d(9)],
  [card, 'outflow', '180', 'Online Shopping', 'Amazon', d(11)],
  [card, 'outflow', '45', 'Streaming', 'Subscriptions', d(3)],
  [card, 'outflow', '38.50', 'Interest', 'Card interest', d(16)],
  [checking, 'inflow', '3200', 'Salary', 'Monthly paycheck', pd(2)],
  [checking, 'outflow', '1450', 'Rent', 'August rent', pd(1)],
  [checking, 'outflow', '260', 'Groceries', 'Groceries', pd(5)],
  [checking, 'outflow', '80', 'Dining', 'Dinner', pd(7)],
  [card, 'outflow', '30', 'Interest', 'Card interest', pd(16)],
]

for (const r of rows) {
  await pool.query(
    `INSERT INTO transactions ("userId","accountId",type,amount,category,description,date) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, r[0], r[1], r[2], r[3], r[4], r[5]],
  )
}
console.log('[v0] seeded', rows.length, 'transactions; checking', checking, 'card', card)
await pool.end()
