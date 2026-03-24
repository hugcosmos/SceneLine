import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, FileText, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Script } from "@shared/schema";
import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Scripts() {
  const { t, lang } = useI18n();
  const { toast } = useToast();

  const { data: scripts, isLoading } = useQuery<Script[]>({
    queryKey: ["/api/scripts"],
    queryFn: async () => {
      const res = await fetch("/api/scripts");
      if (!res.ok) throw new Error("Failed to fetch scripts");
      return res.json();
    },
  });

  const deleteScript = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/scripts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      toast({ title: t("detail.deleted"), description: t("detail.deletedDesc") });
    },
    onError: (err: Error) => {
      toast({ title: t("detail.deleteFailed"), description: err.message, variant: "destructive" });
    },
  });

  const LANG_LABELS: Record<string, string> = {
    zh: t("lang.zh"),
    en: t("lang.en"),
    mixed: t("lang.mixed"),
  };

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("scripts.title")}</h1>
        <Link href="/scripts/new">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            {t("scripts.new")}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-card-border">
              <CardContent className="pt-5 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : scripts?.length === 0 ? (
        <Card className="border-card-border border-dashed">
          <CardContent className="py-16 flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t("home.noScripts")}</p>
            <Link href="/scripts/new">
              <Button variant="outline" size="sm">
                <Plus className="mr-1 h-3 w-3" /> {t("home.uploadScript")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {scripts?.map((s) => (
            <Card key={s.id} className="border-card-border group">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-medium truncate pr-2">
                    {s.title}
                  </CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("detail.confirmDelete")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("detail.deleteDesc")}「{s.title}」？
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("detail.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteScript.mutate(s.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteScript.isPending ? (
                            <span className="animate-spin">...</span>
                          ) : (
                            t("detail.delete")
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {LANG_LABELS[s.language] ?? s.language}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</p>
                <Link href={`/scripts/${s.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    {t("scripts.view")} <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
