import { createInterface } from "node:readline/promises";
import bcrypt from "bcryptjs";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question("Password: ");
rl.close();

if (!password) {
  console.error("Password must not be empty");
  process.exit(1);
}

console.log(`\nAUTH_PASSWORD_HASH='${await bcrypt.hash(password, 12)}'`);
