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
