"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DocFile {
  path: string;
  title: string;
  route: string;
}

const docFiles: DocFile[] = [
  { path: "docs/README.md", title: "Documentation Index", route: "/docs" },
  { path: "docs/finance/README.md", title: "Finance Overview", route: "/docs/finance" },
  { path: "docs/finance/database.md", title: "Database", route: "/docs/finance/database" },
  { path: "docs/finance/pages.md", title: "Pages", route: "/docs/finance/pages" },
  { path: "docs/finance/components.md", title: "Components", route: "/docs/finance/components" },
  { path: "docs/finance/api-endpoints.md", title: "API Endpoints", route: "/docs/finance/api-endpoints" },
  { path: "docs/finance/data-flow.md", title: "Data Flow", route: "/docs/finance/data-flow" },
];

export default function DocsPage() {
  const pathname = usePathname();
  
  // Find current doc based on pathname, handling nested routes
  const currentDoc = docFiles.find(doc => {
    if (pathname === doc.route) return true;
    // Handle finance sub-routes
    if (pathname.startsWith("/docs/finance") && doc.route.startsWith("/docs/finance")) {
      return pathname === doc.route;
    }
    return false;
  }) || (pathname === "/docs" ? docFiles[0] : docFiles.find(doc => doc.route === "/docs/finance/README.md".replace("docs/", "/docs/")) || docFiles[0]);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDoc = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/docs?path=${encodeURIComponent(currentDoc.path)}`);
        if (response.ok) {
          const text = await response.text();
          setContent(text);
        } else {
          setContent("# Documentation\n\nDocumentation file not found.");
        }
      } catch (error) {
        setContent("# Error\n\nFailed to load documentation.");
      } finally {
        setLoading(false);
      }
    };

    loadDoc();
  }, [currentDoc.path]);

  return (
    <div className="w-full p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="text-muted-foreground">Technical documentation and reference</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Navigation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground mb-2">General</p>
              {docFiles.filter(doc => doc.route === "/docs").map((doc) => (
                <Link key={doc.route} href={doc.route}>
                  <Button
                    variant={pathname === doc.route ? "default" : "ghost"}
                    className="w-full justify-start text-left"
                    size="sm"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {doc.title}
                  </Button>
                </Link>
              ))}
              
              <p className="text-xs font-semibold text-muted-foreground mb-2 mt-4">Finance</p>
              {docFiles.filter(doc => doc.route.startsWith("/docs/finance") && doc.route !== "/docs/finance").map((doc) => (
                <Link key={doc.route} href={doc.route}>
                  <Button
                    variant={pathname === doc.route ? "default" : "ghost"}
                    className="w-full justify-start text-left pl-8"
                    size="sm"
                  >
                    <ChevronRight className="h-3 w-3 mr-2" />
                    {doc.title.replace("Finance ", "")}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{currentDoc.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="text-muted-foreground">Loading documentation...</div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

