import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useLang } from '../i18n/LangContext.jsx';

const ELEMENT_ID = 'mamey-barcode-scanner';

export default function BarcodeScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);
  const { t } = useLang();

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
      .catch(() => onClose(t('barcode.cameraError')));

    return () => {
      stopped = true;
      scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="card">
      <div id={ELEMENT_ID} style={{ borderRadius: 12, overflow: 'hidden' }} />
      <p className="muted">{t('barcode.pointHint')}</p>
      <button className="secondary" onClick={() => onClose()}>{t('barcode.cancel')}</button>
    </div>
  );
}
