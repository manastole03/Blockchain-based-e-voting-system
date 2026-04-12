import { RecoilRoot } from "recoil";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "react-hot-toast";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <RecoilRoot>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: "#111",
            color: "#fff",
            border: "1px solid #222",
            borderRadius: "12px",
            fontSize: "14px",
            fontFamily: "'Inter', sans-serif",
          },
          success: {
            iconTheme: { primary: "#00E676", secondary: "#111" },
          },
          error: {
            iconTheme: { primary: "#FF1A1A", secondary: "#111" },
          },
        }}
      />
    </RecoilRoot>
  );
}
