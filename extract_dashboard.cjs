const fs = require('fs');

const appPath = 'src/App.tsx';
const outPath = 'src/views/DashboardView.tsx';
const content = fs.readFileSync(appPath, 'utf-8');
const lines = content.split(/\r?\n/);

function findLine(pattern, startAt = 0) {
  for (let i = startAt; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

// Padrões aproximados para encontrar os blocos
const patterns = [
  'const StatCard = memo(',
  'const ChartCard = memo(',
  'const QuestionsModal = memo(',
  'const formatRelativeTime = (',
  'const DashboardView = ({'
];

const starts = patterns.map(p => findLine(p));
const salesViewLine = findLine('const SalesView = memo(');

console.log('Found lines:', starts, 'SalesView:', salesViewLine);

if (starts.some(s => s === -1) || salesViewLine === -1) {
  console.error('Não encontrou todos os blocos necessários');
  process.exit(1);
}

const firstStart = Math.min(...starts);
const dashboardEnd = salesViewLine; // SalesView começa depois do DashboardView

// Extrair as linhas
const extractedLines = lines.slice(firstStart, dashboardEnd);

// Construir o novo arquivo
const imports = `// src/views/DashboardView.tsx — View do Dashboard com métricas e gráficos
import React, { useState, useEffect, useMemo, useContext, memo } from 'react';
import {
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Box,
  BarChart3,
  MessageCircle,
  Truck,
  EyeOff,
  Eye,
  RefreshCw,
  Calendar,
  Filter,
  History,
  X,
  MessageSquare,
  Loader2,
  Activity,
  TrendingDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn, parseLocalDate } from '../utils';
import { DataContext } from '../App';
import QuestionsDashboard from '../components/QuestionsDashboard';

`;

// Remover declaração duplicada de formatRelativeTime se houver
let body = extractedLines.join('\n');

// Adicionar export na declaração do DashboardView
body = body.replace('const DashboardView = ({', 'export const DashboardView = ({');

// Verificar se existe TrendingUp no StatCard (é usado mas não importado no bloco original)
// Já incluímos no import acima

fs.writeFileSync(outPath, imports + body, 'utf-8');
console.log('DashboardView.tsx criado com sucesso!');
console.log('Linhas extraídas:', extractedLines.length);

