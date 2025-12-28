import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PERSONA_SPEC = `
# Throxy Ideal Lead Profile

## Lead Targeting by Company Size

### Startups (1-50 employees)
Primary Targets: Founder/CEO/Owner/Managing Director/Head of Sales - Priority 5/5

### SMB (51-200 employees)
Primary Targets: VP of Sales, Head of Sales, Sales Director, Director of Sales Development, CRO, Head of Revenue Operations, VP of Growth - Priority 5/5

### Mid-Market (201-1,000 employees)
Primary Targets: VP of Sales Development, VP of Sales, Head of Sales Development, Director of Sales Development, CRO, VP of Revenue Operations, VP of GTM - Priority 5/5

### Enterprise (1,000+ employees)
Primary Targets: VP of Sales Development, VP of Inside Sales, Head of Sales Development, CRO, VP of Revenue Operations, Director of Sales Development, VP of Field Sales - Priority 5/5

## Key Principles
1. Match job title and seniority to company size
2. Prioritize Sales Development and Revenue Operations roles
3. Exclude non-decision makers in larger companies
4. Favor candidates at companies selling into complex verticals (manufacturing, education, healthcare)
`;

export async function POST(req: NextRequest) {
  try {
    const { leadIds } = await req.json();

    if (!leadIds || !Array.isArray(leadIds)) {
      return NextResponse.json(
        { error: 'leadIds must be an array' },
        { status: 400 }
      );
    }

    // Obtener leads de Supabase
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .in('id', leadIds);

    if (leadsError) {
      return NextResponse.json(
        { error: `Failed to fetch leads: ${leadsError.message}` },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: 'No leads found' },
        { status: 404 }
      );
    }

    // Usar ChatGPT para rankear
    const leadsText = leads
      .map(
        (lead) =>
          `${lead.lead_first_name} ${lead.lead_last_name} - ${lead.lead_job_title} at ${lead.account_name} (${lead.company_size}, ${lead.account_employee_range} employees, ${lead.account_industry})`
      )
      .join('\n');

    const prompt = `You are an AI assistant evaluating sales leads for Throxy, a B2B outbound sales company.

Based on the following persona specification:
${PERSONA_SPEC}

Rank these leads from 0-100 (100 = perfect fit, 0 = irrelevant). Return JSON array with { leadIndex, score, reasoning }:

${leadsText}

Respond ONLY with valid JSON array, no other text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    let content = response.choices[0].message.content || '[]';
    // Limpiar markdown si GPT envuelve el JSON
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const rankings = JSON.parse(content);

    // Guardar rankings en Supabase
    const rankingRecords = rankings.map((r: any) => ({
      lead_id: leads[r.leadIndex].id,
      score: r.score,
      reasoning: r.reasoning || '',
    }));

    const { error: insertError } = await supabase
      .from('rankings')
      .insert(rankingRecords);

    // --- AI cost tracking ---
    // gpt-4o-mini pricing (as of 2024-06):
    // input: $5.00/millón tokens, output: $15.00/millón tokens
    // https://openai.com/api/pricing/
    const usage = response.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const inputCost = usage.prompt_tokens * 0.000005;
    const outputCost = usage.completion_tokens * 0.000015;
    const totalCost = inputCost + outputCost;

    if (insertError) {
      return NextResponse.json(
        { error: `Failed to save rankings: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      rankings: rankingRecords,
      ai_stats: {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        input_cost_usd: inputCost,
        output_cost_usd: outputCost,
        total_cost_usd: totalCost,
        model: 'gpt-4o-mini',
      },
    });
  } catch (error) {
    console.error('Ranking error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
