import { calculatePenalty } from '../nlp_engine.js';
(async () => {
  console.log(await calculatePenalty("Real Madrid", "Bellingham es baja definitiva. Vinicius duda."));
})();
