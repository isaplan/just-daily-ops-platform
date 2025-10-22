import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ProductPerformance {
  productName: string;
  quantity: number;
  revenue: number;
  profit?: number;
  category?: string;
}

interface SalesIntelligenceCardProps {
  title: string;
  data: ProductPerformance[];
  isLoading?: boolean;
  showProfit?: boolean;
}

export function SalesIntelligenceCard({
  title,
  data,
  isLoading = false,
  showProfit = false,
}: SalesIntelligenceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No data available
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                {showProfit && <TableHead className="text-right">Profit</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.slice(0, 10).map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.productName}</span>
                      {item.category && (
                        <Badge variant="outline" className="w-fit text-xs mt-1">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right font-medium">
                    €{item.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  {showProfit && item.profit !== undefined && (
                    <TableCell className="text-right font-medium text-green-600">
                      €{item.profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
