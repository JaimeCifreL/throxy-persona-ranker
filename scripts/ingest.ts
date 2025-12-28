import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Parser TSV
function parseTSV(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  function parseLine(line: string) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === '\t' && !inQuotes) {
        values.push(current.replace(/^"|"$/g, '').trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.replace(/^"|"$/g, '').trim());
    return values;
  }

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: any = {};
    headers.forEach((header, i) => {
      row[header.trim()] = values[i] ? values[i].trim() : '';
    });
    return row;
  });
}

async function ingestLeads() {
  console.log('Ingesting leads from TSV...');

  const tsvPath = path.join(
    __dirname,
    '../../data/leads_filtered.tsv'
  );

  if (!fs.existsSync(tsvPath)) {
    console.error(`!!! File not found: ${tsvPath}`);
    process.exit(1);
  }

  const leadsData = parseTSV(tsvPath);
  console.log(`Parsed ${leadsData.length} leads`);

  // Transform para Supabase (omit priority si es numérico en CSV)
  const leadsForDB = leadsData.map((lead) => ({
    account_name: lead.account_name || '',
    lead_first_name: lead.lead_first_name || '',
    lead_last_name: lead.lead_last_name || '',
    lead_job_title: lead.lead_job_title || '',
    account_domain: lead.account_domain || '',
    account_employee_range: lead.account_employee_range || '',
    account_industry: lead.account_industry || '',
    company_size: lead.company_size || '',
    priority: parseInt(lead.priority) || 0,
    is_champion: lead.is_champion || 'no',
  }));

  // Insertar en chunks (Supabase tiene límite ~1000 filas por batch)
  const chunkSize = 100;
  for (let i = 0; i < leadsForDB.length; i += chunkSize) {
    const chunk = leadsForDB.slice(i, i + chunkSize);
    const { error } = await supabase.from('leads').insert(chunk);

    if (error) {
      console.error(`!!!! Error inserting chunk ${i / chunkSize + 1}:`, error);
      process.exit(1);
    }

    console.log(`Inserted chunk ${i / chunkSize + 1} of ${Math.ceil(leadsForDB.length / chunkSize)}`);
  }

  console.log('Ingestion complete!!!!!');
}

ingestLeads().catch(console.error);
