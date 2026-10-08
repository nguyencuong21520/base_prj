/**
 * Creates ready-to-use demo accounts. Safe to run many times: existing
 * accounts are left untouched. Run with `npm run seed`.
 */
import mongoose from 'mongoose';
import { connectDb } from '../config/db';
import { env } from '../config/env';
import { UserModel } from '../models/user.model';
import { hashPassword } from '../utils/hash';

export const DEMO_ACCOUNTS = [
  { email: 'demo@example.com', password: 'demo1234', displayName: 'Demo User', role: 'user' },
  { email: 'admin@example.com', password: 'admin1234', displayName: 'Demo Admin', role: 'admin' }
] as const;

export const seedDemoAccounts = async () => {
  const created: string[] = [];
  for (const account of DEMO_ACCOUNTS) {
    const exists = await UserModel.exists({ email: account.email });
    if (exists) continue;

    await UserModel.create({
      email: account.email,
      password: await hashPassword(account.password),
      displayName: account.displayName,
      role: account.role,
      isEmailVerified: true
    });
    created.push(account.email);
  }
  return created;
};

const run = async () => {
  // The demo admin has a public password: never create it on a real deployment.
  if (env.nodeEnv === 'production') throw new Error('Refusing to seed demo accounts when NODE_ENV=production.');
  await connectDb();
  const created = await seedDemoAccounts();
  console.log(created.length ? `Created: ${created.join(', ')}` : 'Demo accounts already exist.');
  for (const account of DEMO_ACCOUNTS) console.log(`  ${account.email} / ${account.password}`);
  await mongoose.disconnect();
};

if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
