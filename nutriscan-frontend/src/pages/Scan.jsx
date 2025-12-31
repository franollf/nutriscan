import { useEffect, useRef, useState } from "react";
import Quagga from "quagga";
import api from "../api/axios";

export default function Scan() {
  const scannerRef = useRef(null);

  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(true);

  /* -------------------- START SCANNER -------------------- */
  useEffect(() => {
    if (!scannerRef.current || !scanning) return;

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment",
          },
        },
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "upc_reader",
            "upc_e_reader",
          ],
        },
      },
      (err) => {
        if (err) {
          console.error("Quagga init error:", err);
          setError("Camera access failed");
          return;
        }
        Quagga.start();
      }
    );

    Quagga.onDetected(onDetected);

    return () => {
      Quagga.offDetected(onDetected);
      Quagga.stop();
    };
  }, [scanning]);

  /* -------------------- BARCODE DETECTED -------------------- */
  const onDetected = (data) => {
    const code = data.codeResult.code;
    Quagga.stop();
    setScanning(false);
    setBarcode(code);
    lookupBarcode(code);
  };

  /* -------------------- BACKEND LOOKUP -------------------- */
 const lookupBarcode = async (code) => {
  setLoading(true);
  setError("");
  setProduct(null);

  try {
    const res = await api.get(`/product/${code}`);

    alert(JSON.stringify(res.data));
    console.log("BACKEND RESPONSE:", res.data);

    // 🔑 THIS LINE IS NON-NEGOTIABLE
    const p = res.data.product;

    if (!p) {
      throw new Error("Product missing in response");
    }

    setProduct({
      name: p.name,
      calories: p.calories,
      protein: p.protein,
      carbs: p.carbs,
      fat: p.fat,
    });
  } catch (err) {
    console.error("LOOKUP ERROR:", err);
    setError("Product not found. Try manual entry.");
  } finally {
    setLoading(false);
  }
};


  /* -------------------- RESET SCAN -------------------- */
  const resetScan = () => {
    setBarcode("");
    setProduct(null);
    setError("");
    setScanning(true);
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold mb-4">Scan Barcode</h1>

      {/* CAMERA */}
      {scanning && (
        <div
          ref={scannerRef}
          className="w-full h-64 border rounded overflow-hidden mb-4"
        />
      )}

      {/* BARCODE */}
      {barcode && (
        <p className="mb-2">
          <strong>Detected barcode:</strong> {barcode}
        </p>
      )}

      {/* LOADING */}
      {loading && <p>Looking up product…</p>}

      {/* ERROR */}
      {error && <p className="text-red-600">{error}</p>}

      {/* PRODUCT INFO */}
      {product && (
        <div className="border rounded p-4 mt-4">
          <h2 className="font-semibold mb-2">{product.name}</h2>
          <p>Calories: {product.calories ?? "N/A"}</p>
          <p>Protein: {product.protein ?? "N/A"} g</p>
          <p>Carbs: {product.carbs ?? "N/A"} g</p>
          <p>Fat: {product.fat ?? "N/A"} g</p>
        </div>
      )}

      {/* MANUAL ENTRY */}
      <div className="mt-6">
        <label className="block text-sm mb-1">Manual barcode entry</label>
        <div className="flex gap-2">
          <input
            className="border px-3 py-2 rounded w-full"
            placeholder="Enter barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
          <button
            className="bg-green-600 text-white px-4 rounded"
            onClick={() => lookupBarcode(barcode)}
          >
            Search
          </button>
        </div>
      </div>

      {/* RESET */}
      {!scanning && (
        <button
          className="mt-4 underline text-sm"
          onClick={resetScan}
        >
          Scan another item
        </button>
      )}
    </div>
  );
}
