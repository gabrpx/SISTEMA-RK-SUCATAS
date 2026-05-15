import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const NOTION_TOKEN = (process.env.NOTION_TOKEN || "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").trim();
const MOTOS_DATABASE_ID = (process.env.NOTION_DB_MOTOS || "317dfa25a528805f9663ff0e6ebf0318").replace(/-/g, "").trim();
const NOTION_VERSION = '2022-06-28';

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

function formatMotosItem(page: any) {
    const props = page.properties;
    
    const titleProp = Object.values(props).find((p: any) => p.type === 'title') as any;
    const nome = titleProp?.title?.[0]?.plain_text || '-';

    const result: any = {
      notion_id: page.id,
      nome: nome,
      marca: '-',
      modelo: '-',
      ano: '-',
      rk_id: '-', 
      cilindrada: 0,
      lote: '-',
      nome_nf: '-',
      pecas_retiradas: '-',
      status: '-',
      valor: 0,
      cor: '-',
      descricao: '',
      imagens: [],
      criado_em: page.created_time
    };

    for (const [key, prop] of Object.entries(props)) {
      const value = prop as any;
      const lowerKey = key.toLowerCase();
      
      if (value.type === 'rich_text') {
        const text = value.rich_text?.[0]?.plain_text || '-';
        if (lowerKey === 'marca') result.marca = text;
        else if (lowerKey === 'modelo') result.modelo = text;
        else if (lowerKey === 'cor') result.cor = text;
        else if (lowerKey === 'observações' || lowerKey === 'observacoes' || lowerKey === 'descrição') result.descricao = text;
        else if (lowerKey === 'nome nf') result.nome_nf = text;
        else if (lowerKey === 'peças retiradas' || lowerKey === 'pecas retiradas') result.pecas_retiradas = text;
      }
      else if (value.type === 'number') {
        if (lowerKey === 'valor') result.valor = value.number || 0;
        else if (lowerKey === 'cilindrada') result.cilindrada = value.number || 0;
        else if (lowerKey === 'ano') result.ano = value.number?.toString() || '-';
      }
      else if (value.type === 'select' && value.select) {
        if (lowerKey === 'lote') result.lote = value.select.name;
      }
      else if (value.type === 'status' && value.status) {
        if (lowerKey === 'status') result.status = value.status.name;
      }
      else if (value.type === 'files') {
        const urls = value.files.map((file: any) => file.file?.url || file.external?.url || '').filter(Boolean);
        if (urls.length > 0) {
          result.imagens = urls;
        }
      }
      else if (value.type === 'unique_id' && value.unique_id) {
        if (lowerKey === 'id') {
          result.rk_id = `${value.unique_id.prefix ? value.unique_id.prefix + '-' : ''}${value.unique_id.number}`;
        }
      }
    }
    
    if (result.nome === '-' && result.modelo !== '-') {
      result.nome = result.modelo;
    }
    
    return result;
}

async function fetchAllFromNotion() {
    let allResults: any[] = [];
    let cursor = undefined;
    let hasMore = true;
    
    console.log(`🔄 Buscando motos do Notion (Database: ${MOTOS_DATABASE_ID})...`);
    
    while (hasMore) {
        const payload: any = { 
            page_size: 100,
            sorts: [{ timestamp: "created_time", direction: "descending" }]
        };
        if (cursor) payload.start_cursor = cursor;
        
        const response = await fetch(`https://api.notion.com/v1/databases/${MOTOS_DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_TOKEN}`,
                'Content-Type': 'application/json',
                'Notion-Version': NOTION_VERSION
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Notion error: ${err}`);
        }

        const data: any = await response.json();
        allResults = [...allResults, ...data.results];
        hasMore = data.has_more;
        cursor = data.next_cursor;
        console.log(`   → +${data.results.length} itens carregados.`);
    }
    return allResults;
}

async function migrate() {
    try {
        console.log("🏁 Iniciando migração de Motos: Notion -> Supabase");
        const notionItems = await fetchAllFromNotion();
        
        for (const item of notionItems) {
            const formatted = formatMotosItem(item);
            const { imagens, notion_id, ...motoData } = formatted;

            console.log(`🚚 Migrando: ${formatted.nome} (${formatted.rk_id})`);

            const { data: moto, error: motoErr } = await supabase
                .from('motos')
                .insert([motoData])
                .select()
                .single();

            if (motoErr) {
                console.error(`❌ Erro ao inserir moto ${formatted.nome}:`, motoErr.message);
                continue;
            }

            if (imagens && imagens.length > 0) {
                const imgInserts = imagens.map((url: string, index: number) => ({
                    moto_id: moto.id,
                    url,
                    ordem: index
                }));
                const { error: imgErr } = await supabase.from('moto_imagens').insert(imgInserts);
                if (imgErr) console.error(`⚠️ Erro ao inserir imagens para ${formatted.nome}:`, imgErr.message);
            }
        }
        console.log("✅ Migração concluída!");
    } catch (err) {
        console.error("💥 Erro fatal na migração:", err);
    }
}

migrate();