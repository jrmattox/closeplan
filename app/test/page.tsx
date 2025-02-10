export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-primary">
        Theme Test Page
      </h1>

      {/* Test borders */}
      <div className="mt-4 space-y-4">
        <div className="p-4 border rounded-lg">
          Default Border (border-border)
        </div>
        <div className="p-4 border border-primary rounded-lg">
          Primary Border
        </div>
        <div className="p-4 border border-destructive rounded-lg">
          Destructive Border
        </div>
      </div>

      {/* Test colors */}
      <div className="mt-4 space-y-4">
        <div className="p-4 bg-primary text-primary-foreground rounded-lg">
          Primary
        </div>
        <div className="p-4 bg-secondary text-secondary-foreground rounded-lg">
          Secondary
        </div>
      </div>
    </div>
  );
}
