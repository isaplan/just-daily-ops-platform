"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Map, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Star,
  ThumbsUp,
  MessageCircle,
  Calendar,
  Target,
  Users
} from "lucide-react";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "planned" | "cancelled";
  priority: "high" | "medium" | "low";
  category: string;
  votes: number;
  comments: number;
  due_date?: string;
  assignee?: string;
}

export default function RoadmapPage() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Mock roadmap data
  const roadmapItems: RoadmapItem[] = [
    {
      id: "1",
      title: "Advanced Analytics Dashboard",
      description: "Implement AI-powered insights and predictive analytics for financial data",
      status: "in-progress",
      priority: "high",
      category: "Analytics",
      votes: 24,
      comments: 8,
      due_date: "2024-02-15",
      assignee: "Dev Team"
    },
    {
      id: "2",
      title: "Mobile App for Staff",
      description: "Native mobile app for staff to view schedules, clock in/out, and access reports",
      status: "planned",
      priority: "high",
      category: "Mobile",
      votes: 18,
      comments: 12,
      due_date: "2024-03-01",
      assignee: "Mobile Team"
    },
    {
      id: "3",
      title: "Real-time Inventory Tracking",
      description: "Live inventory updates with automatic reorder points and supplier integration",
      status: "planned",
      priority: "medium",
      category: "Inventory",
      votes: 15,
      comments: 5,
      due_date: "2024-04-01"
    },
    {
      id: "4",
      title: "Multi-location Support",
      description: "Enhanced support for managing multiple restaurant locations with consolidated reporting",
      status: "completed",
      priority: "high",
      category: "Core",
      votes: 32,
      comments: 15,
      due_date: "2024-01-10",
      assignee: "Backend Team"
    },
    {
      id: "5",
      title: "API Rate Limiting",
      description: "Implement rate limiting and throttling for external API integrations",
      status: "in-progress",
      priority: "medium",
      category: "Infrastructure",
      votes: 8,
      comments: 3,
      due_date: "2024-02-01",
      assignee: "DevOps Team"
    }
  ];

  const categories = ["all", "Analytics", "Mobile", "Inventory", "Core", "Infrastructure"];
  const statuses = ["all", "completed", "in-progress", "planned", "cancelled"];

  const filteredItems = roadmapItems.filter(item => {
    const statusMatch = selectedTab === "all" || item.status === selectedTab;
    const categoryMatch = selectedCategory === "all" || item.category === selectedCategory;
    return statusMatch && categoryMatch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "planned":
        return <Target className="h-4 w-4 text-yellow-500" />;
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case "in-progress":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case "planned":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Planned</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short", 
      day: "numeric"
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Roadmap</h1>
          <p className="text-muted-foreground">Track feature development and vote on upcoming features</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            Submit Feedback
          </Button>
          <Button size="sm">
            <Star className="h-4 w-4 mr-2" />
            Suggest Feature
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList>
                  {statuses.map((status) => (
                    <TabsTrigger key={status} value={status}>
                      {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === "all" ? "All" : category}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap Items */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(item.status)}
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    {getStatusBadge(item.status)}
                    {getPriorityBadge(item.priority)}
                  </div>
                  <p className="text-muted-foreground mb-4">{item.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{item.votes} votes</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{item.comments} comments</span>
                    </div>
                    {item.due_date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Due {formatDate(item.due_date)}</span>
                      </div>
                    )}
                    {item.assignee && (
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{item.assignee}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Vote
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline View */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Map className="h-12 w-12 mx-auto mb-2" />
              <p>Timeline visualization will be implemented</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-green-600">
                {roadmapItems.filter(item => item.status === "completed").length}
              </h3>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-blue-600">
                {roadmapItems.filter(item => item.status === "in-progress").length}
              </h3>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-yellow-600">
                {roadmapItems.filter(item => item.status === "planned").length}
              </h3>
              <p className="text-sm text-muted-foreground">Planned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold">
                {roadmapItems.reduce((sum, item) => sum + item.votes, 0)}
              </h3>
              <p className="text-sm text-muted-foreground">Total Votes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

