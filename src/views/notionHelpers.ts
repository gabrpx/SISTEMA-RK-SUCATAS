/**
 * Limpa o ID do Notion removendo hifens e espaços.
 */
export function cleanNotionId(id: string) {
  if (!id) return "";
  return id.replace(/-/g, "").trim();
}

/**
 * Formata um ID do Notion para o padrão UUID (com hifens).
 */
export function toUuid(id: string) {
  const clean = cleanNotionId(id);
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }
  return id;
}

export function formatInventoryItem(page: any) {
  const props = page.properties;
  const result: any = {
    id: page.id,
    rk_id: '-',
    nome: '-',
    categoria: '-',
    moto: '-',
    ano: '-',
    valor: 0,
    estoque: 0,
    imagem: '',
    ml_link: '',
    descricao: '',
    criado_em: page.created_time
  };

  const titlePropName = Object.keys(props).find(key => props[key].type === 'title');
  if (titlePropName && props[titlePropName].title?.[0]?.plain_text) {
    result.nome = props[titlePropName].title[0].plain_text;
  }

  for (const [key, prop] of Object.entries(props)) {
    const value = prop as any;
    const lowerKey = key.toLowerCase();

    if (value.type === 'rich_text' && value.rich_text?.[0]?.plain_text) {
      const text = value.rich_text[0].plain_text;
      if (lowerKey.includes('moto')) result.moto = text;
      else if (lowerKey.includes('desc') || lowerKey.includes('obs')) result.descricao = text;
      else if (lowerKey.includes('ano')) result.ano = text;
      else if (lowerKey.includes('link') || lowerKey.includes('ml')) result.ml_link = text;
      else if (lowerKey.includes('peça') || lowerKey.includes('nome')) result.nome = text;
    } else if (value.type === 'number') {
      if (lowerKey.includes('valor') || lowerKey.includes('preço')) result.valor = value.number || 0;
      else if (lowerKey.includes('estoque') || lowerKey.includes('quant')) result.estoque = value.number || 0;
      else if (lowerKey.includes('ano')) result.ano = value.number || '-';
    } else if (value.type === 'select' && value.select) {
      if (lowerKey.includes('moto')) result.moto = value.select.name;
      else if (lowerKey.includes('categoria')) result.categoria = value.select.name;
    } else if (value.type === 'multi_select' && value.multi_select?.length > 0) {
      if (lowerKey.includes('categoria')) result.categoria = value.multi_select.map((s: any) => s.name).join(', ');
    } else if (value.type === 'formula') {
      const val = Number(value.formula?.number || value.formula?.string || 0);
      if (lowerKey.includes('valor') || lowerKey.includes('preço')) result.valor = val;
      else if (lowerKey.includes('estoque') || lowerKey.includes('quant')) result.estoque = val;
    } else if (value.type === 'files' && value.files?.[0]) {
      result.imagem = value.files[0].file?.url || value.files[0].external?.url || '';
    } else if (value.type === 'url' && value.url) {
      if (lowerKey.includes('ml') || lowerKey.includes('link')) result.ml_link = value.url;
    } else if (value.type === 'unique_id' && value.unique_id) {
      const prefix = value.unique_id.prefix ? `${value.unique_id.prefix}-` : '';
      result.rk_id = `${prefix}${value.unique_id.number}`;
    }
  }
  return result;
}

export function formatMotosItem(page: any) {
  const props = page.properties;
  const titleProp = Object.values(props).find((p: any) => p.type === 'title') as any;
  const nome = titleProp?.title?.[0]?.plain_text || '-';

  const result: any = {
    id: page.id, nome, marca: '-', modelo: '-', ano: '-', rk_id: '-', 
    cilindrada: '-', lote: '-', nome_nf: '-', pecas_retiradas: '-',
    status: '-', valor: 0, cor: '-', descricao: '', imagem: '', imagens: [],
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
    } else if (value.type === 'number') {
      if (lowerKey === 'valor') result.valor = value.number || 0;
      else if (lowerKey === 'cilindrada') result.cilindrada = value.number || 0;
      else if (lowerKey === 'ano') result.ano = value.number?.toString() || '-';
    } else if (value.type === 'select' && value.select) {
      if (lowerKey === 'lote') result.lote = value.select.name;
    } else if (value.type === 'status' && value.status) {
      if (lowerKey === 'status') result.status = value.status.name;
    } else if (value.type === 'files') {
      const urls = value.files.map((file: any) => file.file?.url || file.external?.url || '').filter(Boolean);
      if (urls.length > 0) {
        result.imagens = urls;
        if (!result.imagem) result.imagem = urls[0];
      }
    } else if (value.type === 'unique_id' && value.unique_id) {
      if (lowerKey === 'id') {
        result.rk_id = `${value.unique_id.prefix ? value.unique_id.prefix + '-' : ''}${value.unique_id.number}`;
      }
    }
  }
  if (result.nome === '-' && result.modelo !== '-') result.nome = result.modelo;
  return result;
}

export function formatSalesItem(page: any) {
  const props = page.properties;
  const result: any = { id: page.id, nome: '-', moto: '-', valor: 0, data: page.created_time, numero_id: '-' };
  const titlePropName = Object.keys(props).find(key => props[key].type === 'title');
  if (titlePropName && props[titlePropName].title?.[0]?.plain_text) {
    result.nome = props[titlePropName].title[0].plain_text;
  }

  for (const [key, prop] of Object.entries(props)) {
    const value = prop as any;
    const lowerKey = key.toLowerCase();
    
    if (value.type === 'rich_text' && value.rich_text?.[0]?.plain_text) {
      const text = value.rich_text[0].plain_text;
      if (lowerKey.includes('moto')) result.moto = text;
      else if ((lowerKey.includes('nome') || lowerKey.includes('peça')) && !lowerKey.includes('obs')) result.nome = text;
    } else if ((value.type === 'number' || value.type === 'formula') && (lowerKey.includes('valor') || lowerKey.includes('preço'))) {
      result.valor = Number(value.number || value.formula?.number || value.formula?.string || 0) || 0;
    } else if (value.type === 'date' && value.date?.start) {
      result.data = value.date.start;
    } else if (value.type === 'unique_id' && value.unique_id) {
      const prefix = value.unique_id.prefix ? `${value.unique_id.prefix}-` : '';
      result.numero_id = `${prefix}${value.unique_id.number}`;
    } else if (value.type === 'select' && value.select) {
      if (lowerKey.includes('tipo') || lowerKey.includes('pagamento') || lowerKey.includes('forma')) result.tipo = value.select.name;
      else if (lowerKey.includes('moto')) result.moto = value.select.name;
    }
  }
  return result;
}