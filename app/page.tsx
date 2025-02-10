/**
 * ClosePlan Homepage
 *
 * Server-side rendered landing page for ClosePlan B2B healthcare sales platform.
 * Implements accessibility best practices and responsive design.
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const features = [
  {
    title: "Role-Based Access Control",
    description: "Secure, isolated environments for both vendor and customer teams with customizable permissions."
  },
  {
    title: "Advanced Stakeholder Mapping",
    description: "Map complex health system hierarchies with dynamic org charts and Definitive Healthcare data."
  },
  {
    title: "Workstream Management",
    description: "Configurable templates for healthcare procurement processes with built-in tracking."
  },
  {
    title: "Compliant Document Management",
    description: "HIPAA-compliant document repository with version control and audit trails, ensuring secure access to current documentation."
  },
  {
    title: "AI Meeting Summaries",
    description: "Automatically capture and summarize key discussion points, maintaining clarity across long sales cycles."
  },
  {
    title: "Real-Time Progress Tracking",
    description: "Comprehensive dashboards with real-time insights into deal stages and stakeholder engagement for both parties."
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Auth Navigation */}
      <nav className="absolute top-0 right-0 p-6 flex gap-4">
        <Button
          asChild
          variant="ghost"
          className="text-white hover:bg-white/10"
        >
          <Link href="/login">Log in</Link>
        </Button>
        <Button
          asChild
          className="bg-white text-blue-600 hover:bg-blue-50"
        >
          <Link href="/signup">Get Started Free</Link>
        </Button>
      </nav>

      {/* Hero Section */}
      <section className="bg-[#2563eb] text-white min-h-[600px] flex items-center">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl">
            <h1 className="text-5xl sm:text-6xl font-bold mb-8">
              Close Complex Healthcare Deals Faster
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              ClosePlan is your dedicated platform for managing complex B2B healthcare sales deals.
            </p>
            <Button
              asChild
              className="bg-white text-blue-600 hover:bg-blue-50"
            >
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="p-6">
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
