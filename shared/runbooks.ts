import type { Category } from "./schema";
export interface Check {
  id: string;
  category: Category | "All";
  title: string;
  detail: string;
}
export const checks: Check[] = [
  {
    id: "impact",
    category: "All",
    title: "Confirm service impact",
    detail:
      "Record affected services, start time, and scope from approved monitoring or the service owner. Do not infer impact from one alarm.",
  },
  {
    id: "changes",
    category: "All",
    title: "Review recent changes",
    detail:
      "Review authorized change records and timestamps. Do not revert changes without the responsible team's approved procedure.",
  },
  {
    id: "network-counters",
    category: "Network",
    title: "Review interface telemetry",
    detail:
      "Ask the network owner for read-only link state, errors, and counter trends. Record exact timestamps and ports; do not alter configuration.",
  },
  {
    id: "network-scope",
    category: "Network",
    title: "Compare affected links",
    detail:
      "Compare reported symptoms across adjacent links and devices using approved monitoring. Ask whether the impact is localized or shared.",
  },
  {
    id: "server-events",
    category: "Server",
    title: "Review server health events",
    detail:
      "Request read-only hardware and management-controller event logs from the server owner. Record power, thermal, memory, and connectivity observations.",
  },
  {
    id: "server-owner",
    category: "Server",
    title: "Identify the service owner",
    detail:
      "Confirm the device-to-service mapping and ask the owner to assess workload impact. Do not reboot, reseat, or replace hardware without approval.",
  },
  {
    id: "facility-alarms",
    category: "Facilities",
    title: "Correlate facility alarms",
    detail:
      "Review approved facility-monitoring trends and alarm timestamps with the qualified facilities team. Do not enter restricted areas or approach unsafe equipment.",
  },
  {
    id: "facility-owner",
    category: "Facilities",
    title: "Engage critical facilities",
    detail:
      "Notify the qualified facilities lead using the site's approved escalation process. Any leak, smoke, unusual odor, or electrical concern requires immediate local safety procedures.",
  },
];
export const checkIdsFor = (category: Category) =>
  checks
    .filter((c) => c.category === "All" || c.category === category)
    .map((c) => c.id);
export const SAFETY =
  "Advisory only. Follow approved site procedures. No commands, equipment control, or autonomous changes.";
