import { h } from '../h.js';
import { createSvgIcon } from '../icons.js';
import { verifyPin } from '../../domain/pin.js';
export function lockScreen({ settings, onUnlock }) {
  const inp = h("input", {
    class: "input",
    type: "password",
    inputmode: "numeric",
    autocomplete: "off",
    "aria-label": "PIN",
    maxlength: 8,
    style: { fontSize: "1.8rem", textAlign: "center", letterSpacing: "0.3em" },
  });
  const msg = h("p", { class: "error", role: "alert" }, "");
  const go = async () => {
    if (await verifyPin(inp.value, settings)) onUnlock();
    else {
      msg.textContent = "Incorrect PIN code.";
      inp.value = "";
    }
  };
  inp.addEventListener("keydown", (e) => e.key === "Enter" && go());
  queueMicrotask(() => inp.focus());
  return h(
    "main",
    {
      class: "screen screen-fade-in",
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        textAlign: "center",
      },
    },
    h(
      "div",
      { class: "brand-mark", style: { width: "48px", height: "48px", marginBottom: "16px" } },
      createSvgIcon("taka", 26),
    ),
    h("h1", null, "TakaTrack Locked"),
    h(
      "p",
      { class: "muted small", style: { marginBottom: "20px" } },
      "Enter your security PIN to access your financial records",
    ),
    h(
      "div",
      { style: { width: "100%", maxWidth: "280px" } },
      inp,
      msg,
      h("button", { class: "btn primary wide", onclick: go }, "Unlock App"),
    ),
  );
}
