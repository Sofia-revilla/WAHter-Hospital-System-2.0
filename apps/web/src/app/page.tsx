import { App } from "@/App";

// App Router needs a page entry, but the prototype lives in App.tsx as one
// client component, the same shape the team designed it in.
export default function Home() {
  return <App />;
}
