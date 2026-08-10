"use client";

import Script from "next/script";
import { useState } from "react";

export default function NonceTest() {
  const [ready, setReady] = useState(false);
  const [out, setOut] = useState("");

  const go = () => {
    if (!window.Accept) {
      setOut("Accept not loaded yet");
      return;
    }
    window.Accept.dispatchData(
      {
        authData: {
          apiLoginID: "869P753dnrE4", // sandbox API Login ID
          clientKey:
            "8bn6M2DYQ952KD7X4BxwfPQz5KHJ7SqCRK7v3XqBCd9qE2nQdtdxunG2ER55Tc94", // sandbox Public Client Key
        },
        cardData: {
          cardNumber: "5424000000000015", // sandbox test Mastercard
          month: "12",
          year: "2027",
          cardCode: "999",
        },
      },
      (r: any) =>
        setOut(
          r.messages.resultCode === "Ok"
            ? JSON.stringify(r.opaqueData, null, 2)
            : "ERROR: " + JSON.stringify(r.messages.message, null, 2),
        ),
    );
  };

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <Script
        src="https://jstest.authorize.net/v1/Accept.js"
        onLoad={() => setReady(true)}
        onError={() => setOut("Accept.js failed to load")}
      />
      <button onClick={go} disabled={!ready}>
        {ready ? "Generate nonce" : "loading…"}
      </button>
      <pre style={{ marginTop: 20, whiteSpace: "pre-wrap" }}>{out}</pre>
    </div>
  );
}
