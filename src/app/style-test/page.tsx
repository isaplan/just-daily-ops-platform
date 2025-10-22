import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StyleTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Style Test Page
          </h1>
          <p className="text-lg text-gray-600">
            Testing if Shadcn UI components and Tailwind CSS are working properly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Button Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button>Default Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="destructive">Destructive Button</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colors & Spacing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-500 text-white p-4 rounded-lg">
                Blue Background
              </div>
              <div className="bg-green-500 text-white p-4 rounded-lg">
                Green Background
              </div>
              <div className="bg-red-500 text-white p-4 rounded-lg">
                Red Background
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Typography Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <h1 className="text-4xl font-bold">Heading 1</h1>
            <h2 className="text-3xl font-semibold">Heading 2</h2>
            <h3 className="text-2xl font-medium">Heading 3</h3>
            <p className="text-lg">Large paragraph text</p>
            <p className="text-base">Regular paragraph text</p>
            <p className="text-sm text-gray-600">Small gray text</p>
          </CardContent>
        </Card>

        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-8 rounded-lg text-white">
          <h2 className="text-2xl font-bold mb-4">Gradient Background</h2>
          <p>This should show a blue to purple gradient background.</p>
        </div>
      </div>
    </div>
  );
}
