type RegisterDeps = {
  app: any;
  supabase: any;
  fetchAllFromNotion: (databaseId: string) => Promise<any[]>;
  formatInventoryItem: (item: any) => any;
  DATABASE_ID: string;
};

export function registerProdutosVendasRoutes({
  app,
  supabase,
  fetchAllFromNotion,
  formatInventoryItem,
  DATABASE_ID,
}: RegisterDeps) {
  // --- PRODUTOS (ESTOQUE) ---
  app.get("/api/produtos", async (req: any, res: any) => {
    try {
      console.log("📦 Buscando produtos no Supabase...");
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("❌ Erro Supabase Produtos:", error);
        throw error;
      }

      const mappedData = (data || []).map((item: any) => ({
        ...item,
        nome: item.peca || "-",
        valor: Number(item.valor) || 0,
        estoque: Number(item.estoque) || 0,
      }));

      if (mappedData.length === 0) {
        console.log("⚠️ Supabase vazio. Buscando fallback no Notion...");
        const notionItems = await fetchAllFromNotion(DATABASE_ID);
        const formatted = notionItems.map(formatInventoryItem);
        console.log(`✅ Fallback Notion: ${formatted.length} produtos carregados.`);
        return res.json({ success: true, data: formatted });
      }

      res.json({ success: true, data: mappedData });
    } catch (error: any) {
      console.error("🔥 Critical Supabase Get Produtos Error:", error.message || error);
      try {
        console.log("🔄 Fallback de emergência para Notion...");
        const notionItems = await fetchAllFromNotion(DATABASE_ID);
        const formatted = notionItems.map(formatInventoryItem);
        return res.json({ success: true, data: formatted, warning: "Usando dados do Notion (Supabase indisponível)" });
      } catch (notionErr: any) {
        console.error("❌ Fallback Notion também falhou:", notionErr.message);
        res.status(500).json({ success: false, error: error.message || "Erro interno no servidor de produtos" });
      }
    }
  });

  app.get("/api/produtos/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      res.json({ success: true, data: { ...data, nome: data.peca } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/produtos", async (req: any, res: any) => {
    try {
      const { peca, nome, categoria, valor, moto, estoque, ano, rk_id, descricao, imagem, ml_link } = req.body;

      let finalRkId = rk_id;
      if (!finalRkId) {
        const { data: existingProducts } = await supabase.from("produtos").select("rk_id");
        const existingIds = (existingProducts || [])
          .map((p: any) => {
            const match = p.rk_id?.match(/RK-(\d+)/);
            return match ? parseInt(match[1], 10) : null;
          })
          .filter((n: number | null): n is number => n !== null)
          .sort((a: number, b: number) => a - b);

        let nextId = 1;
        for (const id of existingIds) {
          if (id === nextId) nextId++;
          else if (id > nextId) break;
        }
        finalRkId = `RK-${nextId}`;
      }

      const payload = {
        peca: peca || nome || "-",
        categoria: categoria || "-",
        valor: Number(valor) || 0,
        moto: moto || "-",
        estoque: Number(estoque) || 0,
        ano: ano || "-",
        rk_id: finalRkId,
        descricao: descricao || "",
        imagem: imagem || "",
        ml_link: ml_link || "",
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("produtos").insert([payload]).select();
      if (error) throw error;
      const created = data?.[0];
      res.json({ success: true, data: created ? { ...created, nome: created.peca || "-" } : null });
    } catch (error: any) {
      console.error("Supabase Create Produto Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/produtos/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { peca, nome, categoria, valor, moto, estoque, ano, rk_id, descricao, imagem, ml_link } = req.body;
      const payload: any = { atualizado_em: new Date().toISOString() };
      if (peca || nome) payload.peca = peca || nome;
      if (categoria) payload.categoria = categoria;
      if (valor !== undefined) payload.valor = Number(valor);
      if (moto) payload.moto = moto;
      if (estoque !== undefined) payload.estoque = Number(estoque);
      if (ano) payload.ano = ano;
      if (rk_id) payload.rk_id = rk_id;
      if (descricao !== undefined) payload.descricao = descricao;
      if (imagem !== undefined) payload.imagem = imagem;
      if (ml_link !== undefined) payload.ml_link = ml_link;

      const { data, error } = await supabase.from("produtos").update(payload).eq("id", id).select();
      if (error) throw error;
      const updated = data?.[0];
      res.json({ success: true, data: updated ? { ...updated, nome: updated.peca || "-" } : null });
    } catch (error: any) {
      console.error("Supabase Update Produto Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.patch("/api/produtos/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { peca, nome, categoria, valor, moto, estoque, ano, rk_id, descricao, imagem, ml_link } = req.body;
      const payload: any = { atualizado_em: new Date().toISOString() };
      const finalPeca = peca ?? nome;
      if (finalPeca !== undefined) payload.peca = finalPeca;
      if (categoria !== undefined) payload.categoria = categoria;
      if (valor !== undefined) payload.valor = Number(valor) || 0;
      if (moto !== undefined) payload.moto = moto;
      if (estoque !== undefined) payload.estoque = Number(estoque) || 0;
      if (ano !== undefined) payload.ano = ano;
      if (rk_id !== undefined) payload.rk_id = rk_id;
      if (descricao !== undefined) payload.descricao = descricao;
      if (imagem !== undefined) payload.imagem = imagem;
      if (ml_link !== undefined) payload.ml_link = ml_link;

      const { data, error } = await supabase.from("produtos").update(payload).eq("id", id).select();
      if (error) throw error;
      const updated = data?.[0];
      res.json({ success: true, data: updated ? { ...updated, nome: updated.peca || "-" } : null });
    } catch (error: any) {
      console.error("Supabase Patch Produto Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/produtos/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Supabase Delete Produto Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- VENDAS ---
  app.get("/api/vendas", async (req: any, res: any) => {
    try {
      const { data, error } = await supabase.from("vendas").select("*").order("data", { ascending: false });
      if (error) throw error;
      const mappedData = data.map((item: any) => ({ ...item, nome: item.peca || "-", tipo: item.pagamento || "Pix" }));
      res.json({ success: true, data: mappedData });
    } catch (error: any) {
      console.error("Supabase Get Vendas Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/vendas/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase.from("vendas").select("*").eq("id", id).single();
      if (error) throw error;
      res.json({ success: true, data: { ...data, nome: data.peca, tipo: data.pagamento } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/vendas", async (req: any, res: any) => {
    try {
      const { nome, peca, moto, valor, tipo, pagamento, data, observacoes } = req.body;
      const payload = {
        peca: peca || nome || "-",
        moto: moto || "-",
        valor: Number(valor) || 0,
        pagamento: pagamento || tipo || "Pix",
        data:
          data ||
          new Date()
            .toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" })
            .split("/")
            .reverse()
            .join("-"),
        observacoes: observacoes || "",
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      };

      const { data: insertedData, error } = await supabase.from("vendas").insert([payload]).select();
      if (error) throw error;
      const item = insertedData[0];
      res.json({ success: true, data: { ...item, nome: item.peca, tipo: item.pagamento } });
    } catch (error: any) {
      console.error("Supabase Create Venda Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put("/api/vendas/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { nome, peca, moto, valor, tipo, pagamento, data, observacoes } = req.body;
      const payload: any = { atualizado_em: new Date().toISOString() };
      if (peca || nome) payload.peca = peca || nome;
      if (moto) payload.moto = moto;
      if (valor !== undefined) payload.valor = Number(valor);
      if (pagamento || tipo) payload.pagamento = pagamento || tipo;
      if (data) payload.data = data;
      if (observacoes !== undefined) payload.observacoes = observacoes;

      const { data: updatedData, error } = await supabase.from("vendas").update(payload).eq("id", id).select();
      if (error) throw error;
      const item = updatedData[0];
      res.json({ success: true, data: { ...item, nome: item.peca, tipo: item.pagamento } });
    } catch (error: any) {
      console.error("Supabase Update Venda Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.patch("/api/vendas/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { nome, tipo, ...resto } = req.body;
      const payload = {
        ...resto,
        ...(nome ? { peca: nome } : {}),
        ...(tipo ? { pagamento: tipo } : {}),
        atualizado_em: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("vendas").update(payload).eq("id", id).select();
      if (error) throw error;
      const item = data[0];
      res.json({ success: true, data: { ...item, nome: item.peca, tipo: item.pagamento } });
    } catch (error: any) {
      console.error("Supabase Patch Venda Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/vendas/:id", async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { error } = await supabase.from("vendas").delete().eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Supabase Delete Venda Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/vendas/bulk-delete", async (req: any, res: any) => {
    try {
      const { ids } = req.body;
      const { error } = await supabase.from("vendas").delete().in("id", ids);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Supabase Bulk Delete Vendas Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- BULK OPERATIONS (PRODUTOS) ---
  app.post("/api/produtos/bulk-delete", async (req: any, res: any) => {
    try {
      const { ids } = req.body;
      const { error } = await supabase.from("produtos").delete().in("id", ids);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Supabase Bulk Delete Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/produtos/bulk-update-category", async (req: any, res: any) => {
    try {
      const { ids, categoria } = req.body;
      const { error } = await supabase.from("produtos").update({ categoria, atualizado_em: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Supabase Bulk Update Category Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/produtos/bulk-update-stock", async (req: any, res: any) => {
    try {
      const { ids, amount } = req.body;
      const { data: items, error: fetchError } = await supabase.from("produtos").select("id, estoque").in("id", ids);
      if (fetchError) throw fetchError;

      const updates = items.map((item: any) => ({
        id: item.id,
        estoque: Math.max(0, (Number(item.estoque) || 0) + amount),
        atualizado_em: new Date().toISOString(),
      }));

      const { error: updateError } = await supabase.from("produtos").upsert(updates);
      if (updateError) throw updateError;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Supabase Bulk Update Stock Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
