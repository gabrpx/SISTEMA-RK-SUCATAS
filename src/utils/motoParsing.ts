import { CATEGORIAS_OFICIAIS, MOTOS_OFICIAIS } from '../constants/lists';

const modelosUnicos = MOTOS_OFICIAIS;

export function normalizarTexto(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

export function extrairModeloMoto(textoPeca: string) {
  if (!textoPeca || textoPeca.length < 3) return '';
  const textoNormalizado = normalizarTexto(textoPeca);

  for (const modelo of modelosUnicos) {
    const modeloNormalizado = normalizarTexto(modelo);
    if (textoNormalizado.includes(modeloNormalizado)) return modelo;
  }

  for (const modelo of modelosUnicos) {
    const modeloNormalizado = normalizarTexto(modelo);
    const palavrasModelo = modeloNormalizado.split(' ');
    if (palavrasModelo.length >= 2) {
      let encontrouTodas = true;
      let posicao = 0;
      for (const palavra of palavrasModelo) {
        const index = textoNormalizado.indexOf(palavra, posicao);
        if (index === -1) {
          encontrouTodas = false;
          break;
        }
        posicao = index + palavra.length;
      }
      if (encontrouTodas) return modelo;
    }
  }

  const padraoNumerico = textoPeca.match(/\b(50|100|110|125|150|160|190|200|250|300|400|500|600|660|900|1000)\b/i);
  if (padraoNumerico) {
    const numero = padraoNumerico[0];
    for (const modelo of modelosUnicos) {
      if (modelo.includes(numero)) return modelo;
    }
  }

  return '';
}

export function extrairCategoria(textoPeca: string) {
  if (!textoPeca || textoPeca.length < 3) return '';
  const textoNormalizado = normalizarTexto(textoPeca);
  const categoriasOrdenadas = [...CATEGORIAS_OFICIAIS].sort((a, b) => b.length - a.length);

  for (const categoria of categoriasOrdenadas) {
    const categoriaNormalizada = normalizarTexto(categoria);
    if (textoNormalizado.includes(categoriaNormalizada) || categoriaNormalizada.includes(textoNormalizado)) {
      return categoria;
    }
  }

  return '';
}
