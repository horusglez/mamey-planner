import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const ELEMENT_ID = 'mamey-barcode-scanner';

export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(ELEMENT_ID);
    scannerRef.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 140 } },
        (decodedText) => {
          if (stopped) return;
          stopped = true;
          onDetected(decodedText);
        },
        () => {} // per-frame "nothing found yet" noise, ignored
      )
      .catch(() => onClose('No se pudo acceder a la cámara.'));

    return () => {
      stopped = true;
      scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="card">
      <div id={ELEMENT_ID} style={{ borderRadius: 12, overflow: 'hidden' }} />
      <p className="muted">Apunta al código de barras del producto.</p>
      <button className="secondary" onClick={() => onClose()}>Cancelar</button>
    </div>
  );
}
