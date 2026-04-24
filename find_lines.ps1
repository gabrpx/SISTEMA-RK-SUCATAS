$lines = Get-Content 'src/App.tsx'
for($i=0; $i -lt $lines.Count; $i++){
  $l = $lines[$i]
  if($l -match 'const StatCard = memo\('){ Write-Host ('StatCard:' + $i) }
  if($l -match 'const ChartCard = memo\('){ Write-Host ('ChartCard:' + $i) }
  if($l -match 'const QuestionsModal = memo\('){ Write-Host ('QuestionsModal:' + $i) }
  if($l -match 'const DashboardView = \('){ Write-Host ('DashboardView:' + $i) }
  if($l -match 'const SalesView = memo\('){ Write-Host ('SalesView:' + $i) }
}

