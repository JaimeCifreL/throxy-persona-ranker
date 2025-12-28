import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types para la base de datos
export type Lead = {
  id: string;
  account_name: string;
  lead_first_name: string;
  lead_last_name: string;
  lead_job_title: string;
  account_domain: string;
  account_employee_range: string;
  account_industry: string;
  company_size: string;
  priority: number;
  is_champion: string;
  import_batch?: string; // Import identifier
  created_at: string;
};

export type Ranking = {
  id: string;
  lead_id: string;
  score: number;
  reasoning: string;
  created_at: string;
};
