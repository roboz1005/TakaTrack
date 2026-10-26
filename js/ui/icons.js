export function createSvgIcon(name, size = 20) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("class", "icon tab-icon");
  const p = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.append(el);
  };
  switch (name) {
    case "taka":
      p("path", { d: "M15.5 7.5A4 4 0 0 0 8 9c0 3.2 4 4.5 4 8.5v2.5" });
      p("line", { x1: "5", y1: "11.5", x2: "15.5", y2: "11.5" });
      break;
    case "home":
      p("path", { d: "M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z" });
      p("polyline", { points: "9 22 9 12 15 12 15 22" });
      break;
    case "transactions":
      p("circle", { cx: "12", cy: "12", r: "9" });
      p("polyline", { points: "12 7 12 12 15 15" });
      break;
    case "people":
      p("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" });
      p("circle", { cx: "9", cy: "7", r: "4" });
      p("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" });
      p("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" });
      break;
    case "more":
      p("rect", { x: "3", y: "3", width: "7", height: "7", rx: "2" });
      p("rect", { x: "14", y: "3", width: "7", height: "7", rx: "2" });
      p("rect", { x: "14", y: "14", width: "7", height: "7", rx: "2" });
      p("rect", { x: "3", y: "14", width: "7", height: "7", rx: "2" });
      break;
    case "plus":
      p("line", { x1: "12", y1: "5", x2: "12", y2: "19" });
      p("line", { x1: "5", y1: "12", x2: "19", y2: "12" });
      break;
    case "eye":
      p("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" });
      p("circle", { cx: "12", cy: "12", r: "3" });
      break;
    case "eye-off":
      p("path", {
        d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24",
      });
      p("line", { x1: "1", y1: "1", x2: "23", y2: "23" });
      break;
    case "sun":
      p("circle", { cx: "12", cy: "12", r: "4" });
      p("line", { x1: "12", y1: "1", x2: "12", y2: "3" });
      p("line", { x1: "12", y1: "21", x2: "12", y2: "23" });
      p("line", { x1: "4.22", y1: "4.22", x2: "5.64", y2: "5.64" });
      p("line", { x1: "18.36", y1: "18.36", x2: "19.78", y2: "19.78" });
      p("line", { x1: "1", y1: "12", x2: "3", y2: "12" });
      p("line", { x1: "21", y1: "12", x2: "23", y2: "12" });
      p("line", { x1: "4.22", y1: "19.78", x2: "5.64", y2: "18.36" });
      p("line", { x1: "18.36", y1: "5.64", x2: "19.78", y2: "4.22" });
      break;
    case "moon":
      p("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" });
      break;
    case "backspace":
      p("path", { d: "M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" });
      p("line", { x1: "18", y1: "9", x2: "12", y2: "15" });
      p("line", { x1: "12", y1: "9", x2: "18", y2: "15" });
      break;
    default:
      p("circle", { cx: "12", cy: "12", r: "9" });
  }
  return svg;
}
