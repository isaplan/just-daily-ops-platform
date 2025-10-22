import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, RefreshCw, PlayCircle, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatDateRange } from "@/lib/monthConverter";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

export function ImportHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  const { data: imports } = useQuery({
    queryKey: ["data-imports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_imports")
        .select("*, locations(name)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const pendingImports = imports?.filter(imp => imp.processed_records === 0 && imp.status === 'completed') || [];

  const reprocessMutation = useMutation({
    mutationFn: async (importId: string) => {
      setProcessingIds(prev => new Set(prev).add(importId));
      
      const { data: importRecord } = await supabase
        .from('data_imports')
        .select('*')
        .eq('id', importId)
        .single();
      
      if (!importRecord) throw new Error("Import record not found");

      const filePath = (importRecord.metadata as any)?.file_path;
      if (!filePath) throw new Error("No file path found");

      await supabase
        .from('data_imports')
        .update({ status: 'processing', processed_records: 0 })
        .eq('id', importId);

      queryClient.invalidateQueries({ queryKey: ["data-imports"] });

      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('finance_imports')
        .download(filePath);
      
      if (downloadError) throw downloadError;

      const arrayBuffer = await fileBlob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);

      // Process based on type
      const type = importRecord.import_type;
      let processedCount = 0;

      try {
        if (type === 'powerbi_pnl') {
          const result = await processPowerBIPnL(workbook, importId, importRecord.location_id);
          processedCount = result.processedCount;
        } else if (type === 'bork_sales') {
          const result = await processBorkSales(workbook, importId, importRecord.location_id);
          processedCount = result.processedCount;
        } else if (type === 'eitje_labor' || type === 'eitje_productivity') {
          throw new Error(`${type} is no longer supported via file import. Use API sync instead.`);
        }

        await supabase
          .from('data_imports')
          .update({
            status: 'completed',
            processed_records: processedCount,
            completed_at: new Date().toISOString()
          })
          .eq('id', importId);

        return { importId, processedCount };
      } catch (error) {
        // Update to failed status with error message
        await supabase
          .from('data_imports')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : String(error),
            completed_at: new Date().toISOString()
          })
          .eq('id', importId);
        
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Reprocessing complete",
        description: `Successfully processed ${data.processedCount} records`,
      });
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(data.importId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["data-imports"] });
    },
    onError: (error: any, importId) => {
      toast({
        title: "Reprocessing failed",
        description: error.message,
        variant: "destructive",
      });
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(importId);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["data-imports"] });
    },
  });

  const processAllPending = async () => {
    for (const imp of pendingImports) {
      await reprocessMutation.mutateAsync(imp.id);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (importId: string) => {
      const { error } = await supabase
        .from('data_imports')
        .delete()
        .eq('id', importId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-imports"] });
      toast({
        title: "Deleted",
        description: "Import record deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import processing function from orchestrator
  const processPowerBIPnL = async (workbook: XLSX.WorkBook, importId: string, locationId: string) => {
    // Use the proper orchestrator function
    const { processPowerBIPnL: orchestratorProcess } = await import('@/lib/finance/powerbi/orchestrator');
    return await orchestratorProcess(workbook, importId, locationId);
  };

  // Legacy fallback for simple processing (now unused)
  const processPowerBIPnLLegacy = async (workbook: XLSX.WorkBook, importId: string, locationId: string) => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const headerRowIndex = jsonData.findIndex((row: any[]) => 
      row.some((cell: any) => typeof cell === 'string' && cell.toLowerCase().includes('grootboekrekening'))
    );

    if (headerRowIndex === -1) throw new Error("Could not find header row");

    const headers = jsonData[headerRowIndex];
    const dataRows = jsonData.slice(headerRowIndex + 1);

    const records = dataRows
      .filter((row: any[]) => row && row.length > 0 && row[0])
      .map((row: any[]) => ({
        import_id: importId,
        location_id: locationId,
        gl_account: row[0],
        category: row[1],
        subcategory: row[2],
        year: row[3],
        month: row[4],
        amount: row[5],
      }));

    const BATCH_SIZE = 500;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await supabase.from('powerbi_pnl_data').insert(batch);
    }

    return { processedCount: records.length };
  };

  // COMMENTED OUT - Use API integration instead
  // const processEitjeLaborHours = async (workbook: XLSX.WorkBook, importId: string, locationId: string) => {
  //   ... old code commented out
  // };

  // const processEitjeProductivity = async (workbook: XLSX.WorkBook, importId: string, locationId: string) => {
  //   ... old code commented out
  // };

  const processBorkSales = async (
    workbook: XLSX.WorkBook,
    importId: string,
    locationId: string
  ): Promise<{ processedCount: number }> => {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, jsonData.length); i++) {
      const row = jsonData[i];
      if (row && Array.isArray(row) && row.some((cell: any) => 
        typeof cell === 'string' && (
          cell.toLowerCase().includes('product') || 
          cell.toLowerCase().includes('item')
        )
      )) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error("Could not find header row in Bork Sales file");
    }

    const headers = jsonData[headerRowIndex] as string[];
    const dataRows = jsonData.slice(headerRowIndex + 1);

    const records = dataRows
      .filter(row => row && row.length > 0)
      .map((row: any[]) => {
        const record: any = { import_id: importId, location_id: locationId };
        
        headers.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          record[normalizedHeader] = row[index];
        });
        
        return record;
      });

    const batchSize = 500;
    let processedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('sales_import_items')
        .insert(batch);

      if (insertError) throw insertError;
      processedCount += batch.length;
    }

    return { processedCount };
  };

  const handleDownload = async (imp: any) => {
    const filePath = imp.metadata?.file_path;
    if (!filePath) {
      toast({
        title: "File not available",
        description: "No file was stored for this import",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('finance_imports')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = imp.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Could not download the file",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      processing: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bork_sales: "Bork Sales",
      eitje_productivity: "Eitje Productivity",
      eitje_labor: "Eitje Labor",
      powerbi_pnl: "PowerBI P&L",
    };
    return labels[type] || type;
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Imports</CardTitle>
        <div className="flex gap-2">
          {pendingImports.length > 0 && (
            <Button
              onClick={processAllPending}
              disabled={reprocessMutation.isPending}
              size="sm"
            >
              {reprocessMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Process All {pendingImports.length} Pending
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imports?.map((imp) => {
                const dateRangeText = formatDateRange(imp.date_range_start, imp.date_range_end);
                const exactDates = imp.date_range_start && imp.date_range_end
                  ? `${format(new Date(imp.date_range_start), 'PPP')} - ${format(new Date(imp.date_range_end), 'PPP')}`
                  : null;

                return (
                  <TableRow key={imp.id}>
                    <TableCell className="font-medium">
                      <div className="line-clamp-2 max-w-[300px]">{imp.file_name}</div>
                    </TableCell>
                    <TableCell>{getTypeLabel(imp.import_type)}</TableCell>
                    <TableCell>{(imp.locations as any)?.name}</TableCell>
                    <TableCell>{getStatusBadge(imp.status)}</TableCell>
                    <TableCell>
                      {imp.processed_records || 0} / {imp.total_records || 0}
                    </TableCell>
                    <TableCell>
                      {dateRangeText ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{dateRangeText}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">{exactDates}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(imp.created_at), "d MMM yyyy").toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {imp.processed_records === 0 && imp.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => reprocessMutation.mutate(imp.id)}
                            disabled={processingIds.has(imp.id) || reprocessMutation.isPending}
                          >
                            {processingIds.has(imp.id) ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing
                              </>
                            ) : (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Process Now
                              </>
                            )}
                          </Button>
                        )}
                        {imp.metadata && typeof imp.metadata === 'object' && 'file_path' in imp.metadata && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(imp)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(imp.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {!imports?.length && (
            <div className="text-center py-8 text-muted-foreground">
              No imports yet. Upload your first file to get started.
            </div>
          )}
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
