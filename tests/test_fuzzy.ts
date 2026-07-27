import { findBestMatch } from '../src/lib/fuzzy';
const candidateLocals = ['Kristiansund BK', 'SK Brann', 'Bodø/Glimt', 'Fredrikstad FK', 'IK Start', 'Aalesund', 'KFUM', 'Molde', 'Rosenborg'];
console.log('START ->', findBestMatch('START', candidateLocals));
console.log('KRISTIANSUND ->', findBestMatch('KRISTIANSUND', candidateLocals));
console.log('BRANN ->', findBestMatch('BRANN', candidateLocals));
