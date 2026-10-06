import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Attendance Vala — Software Vala" },
      { name: "description", content: "Smart attendance management: check-in, breaks, check-out and reports." },
      { property: "og:title", content: "Attendance Vala — Software Vala" },
      { property: "og:description", content: "Smart attendance management by Software Vala." },
    ],
  }),
});
