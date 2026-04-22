import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const username = "rksucatas";
  const email = `${username}@rksucatas.local`;
  const password = "rksucatas115935";

  console.log(`Creating user with mapped email: ${email}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: username
      }
    }
  });

  if (error) {
    console.error("Error creating user:", error.message);
  } else {
    console.log("Success! Administrator user created.", data.user?.id);
  }
}

main();
