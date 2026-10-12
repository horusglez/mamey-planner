export function isSpeechSupported() {
  return typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startListening({ onResult, onError, onEnd }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-MX';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => onResult(event.results[0][0].transcript);
  recognition.onerror = (event) => onError?.(event.error);
  recognition.onend = () => onEnd?.();

  recognition.start();
  return recognition;
}

// "200 gramos de pollo a la plancha" -> { quantityG: 200, query: "pollo a la plancha" }
// Falls back to using the whole phrase as the query when no leading quantity is said.
export function parseSpokenFood(transcript) {
  const match = transcript.trim().match(/^(\d+)\s*(g|gr|gramos)?\s*(de\s+)?(.+)$/i);
  if (match) {
    return { quantityG: Number(match[1]), query: match[4].trim() };
  }
  return { quantityG: null, query: transcript.trim() };
}
