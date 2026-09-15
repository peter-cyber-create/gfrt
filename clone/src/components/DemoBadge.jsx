import { DEMO_MODE } from "../data/mock";

export default function DemoBadge({ className = "" }) {
  if (!DEMO_MODE) return null;
  return (
    <span className={`demo-badge ${className}`} title="Local presentation environment — mock data only">
      Presentation
    </span>
  );
}
