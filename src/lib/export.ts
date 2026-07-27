import { GeneratedTicket } from '../types';

export function exportToTXT(tickets: GeneratedTicket[]) {
  if (tickets.length === 0) return;
  
  const content = tickets.map(t => t.picks.join('')).join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quiniela_optimizada.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToExcel(tickets: GeneratedTicket[]) {
  if (tickets.length === 0) return;

  // Generate Excel CSV with UTF-8 BOM
  let csv = '\uFEFFBoleto ID,Columnas 1-15,Probabilidad Estimada,Coste (€)\n';

  tickets.forEach((t, i) => {
    const formattedPicks = t.picks.join(' ');
    const probPct = (t.probability * 100).toFixed(6) + '%';
    csv += `${i + 1},"${formattedPicks}",${probPct},0.75\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'quiniela_optimizada.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
