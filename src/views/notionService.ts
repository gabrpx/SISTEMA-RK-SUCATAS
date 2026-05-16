import { cleanNotionId, toUuid } from './notionHelpers';


import dotenv from 'dotenv';

dotenv.config();

export const NOTION_TOKEN = (process.env.NOTION_TOKEN || "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").trim();
export const NOTION_VERSION = '2022-06-28';

const dbStructureCache: Record<string, { data: any, timestamp: number }> = {};
const notionDataCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 5; 
const DATA_CACHE_TTL = 1000 * 60 * 5;
const fetchLocks: Record<string, Promise<any> | null> = {};

export function invalidateCache(databaseId?: string) {
  if (databaseId) {
    const cleanId = cleanNotionId(databaseId);
    delete notionDataCache[cleanId];
    console.log(`🧹 Cache invalidado para o banco ${cleanId}`);
  } else {
    Object.keys(notionDataCache).forEach(key => delete notionDataCache[key]);
    console.log('🧹 Todo o cache do Notion foi limpo');
  }
}

export async function getCachedDbStructure(databaseId: string) {
  const cleanId = cleanNotionId(databaseId);
  if (!cleanId) return { properties: {} };
  
  const cached = dbStructureCache[cleanId];
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) return cached.data;

  const uuid = toUuid(cleanId);
  const url = `https://api.notion.com/v1/databases/${uuid}`;
  
  let response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (errorBody.includes('invalid_request_url')) {
      response = await fetch(`https://api.notion.com/v1/databases/${cleanId}`, {
        headers: { 'Authorization': `Bearer ${NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION }
      });
    }
    if (!response.ok) return { properties: {} };
  }
  
  const data = await response.json();
  dbStructureCache[cleanId] = { data, timestamp: Date.now() };
  return data;
}

export async function fetchAllFromNotion(databaseId: string) {
  const cleanId = cleanNotionId(databaseId);
  if (!cleanId || cleanId === 'undefined') return [];
  
  const cached = notionDataCache[cleanId];
  if (cached && (Date.now() - cached.timestamp < DATA_CACHE_TTL)) return cached.data;
  if (fetchLocks[cleanId]) return fetchLocks[cleanId];

  const fetchPromise = (async () => {
    try {
      let allResults: any[] = [];
      let cursor = undefined;
      let hasMore = true;
      
      while (hasMore) {
        const payload: any = { 
          page_size: 100,
          sorts: [{ timestamp: "created_time", direction: "descending" }]
        };
        if (cursor) payload.start_cursor = cursor;
        
        const response = await fetch(`https://api.notion.com/v1/databases/${cleanId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Content-Type': 'application/json',
            'Notion-Version': NOTION_VERSION
          },
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          if (response.status === 404) return [];
          throw new Error(`Notion API error (${response.status})`);
        }

        const data = await response.json();
        allResults = [...allResults, ...data.results];
        hasMore = data.has_more;
        cursor = data.next_cursor;
      }
      
      notionDataCache[cleanId] = { data: allResults, timestamp: Date.now() };
      return allResults;
    } finally {
      fetchLocks[cleanId] = null;
    }
  })();

  fetchLocks[cleanId] = fetchPromise;
  return fetchPromise;
}

export const NOTION_IDS = {
  ESTOQUE: cleanNotionId(process.env.NOTION_DATABASE_ID || "34adfa25a5288191a4eefb66d363f942"),
  MOTOS: cleanNotionId(process.env.NOTION_DB_MOTOS || "317dfa25a528805f9663ff0e6ebf0318"),
  CLIENTES: cleanNotionId(process.env.DATABASE_CLIENTES || process.env.NOTION_DB_CLIENTS || ""),
};