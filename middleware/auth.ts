// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

// Lista de rotas que NÃO precisam de autenticação
const rotasPublicas = [
  '/health',
  '/login',
  '/api/peca/preco',
  '/api/peca/buscar'
];

export function autenticar(req: Request, res: Response, next: NextFunction) {
  // Verificar se a rota atual é pública
  const isPublic = rotasPublicas.some(rota => 
    req.path === rota || req.originalUrl.includes(rota)
  );

  if (isPublic) {
    return next();
  }

  // Buscar token no header Authorization
  const authHeader = req.headers['authorization'];
  const senhaCorreta = process.env.ADMIN_PASSWORD;

  // Se não houver senha configurada, permite acesso (apenas para teste)
  if (!senhaCorreta) {
    console.warn('⚠️ ADMIN_PASSWORD não configurada. Acesso liberado sem autenticação.');
    return next();
  }

  // Verificar se o token existe e é válido
  if (!authHeader || authHeader !== `Bearer ${senhaCorreta}`) {
    return res.status(401).json({
      success: false,
      error: 'Acesso não autorizado',
      message: 'Token inválido ou ausente'
    });
  }

  next();
}

// Middleware para verificar role de admin (se necessário)
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Implementação futura
    next();
  };
}