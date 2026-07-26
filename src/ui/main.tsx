// main.tsx
//
// The entry point. Its ONLY job is to attach React to the page: find the
// <div id="root"> in index.html and render the Combat component into it.
// You write this once and basically never touch it again.

import { createRoot } from "react-dom/client";
import { Combat } from "./combat";
import "./global-style/reset.scss"
import "./global-style/token.scss"
import "@fontsource/share-tech-mono"
import "@fontsource-variable/cascadia-code"


// The `!` says "trust me, #root exists" — it does, it's in index.html.
const root = createRoot(document.getElementById("root")!);

root.render(<Combat />);
