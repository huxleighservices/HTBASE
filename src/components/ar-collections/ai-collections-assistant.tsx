
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Sparkles, Target, Activity, Zap, BarChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getArCollectionsInsights } from '@/ai/flows/ar-collections-assistant-flow';
import type { ARCustomer } from '@/types/client';

type EnrichedARCustomer = ARCustomer & {
    totalPaid: number;
    totalOwed: number;
    currentBalance: number;
    progress: number;
    daysSinceBuild: number | null;
};

type ArInsights = {
    keyInsight: string;
    collectionHealthScore: number;
    priorityActions: {
        customerName: string;
        reason: string;
        suggestedAction: string;
    }[];
}

export function AiCollectionsAssistant({ customers }: { customers: EnrichedARCustomer[] | null }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [insights, setInsights] = useState<ArInsights | null>(null);

    const handleGetInsights = async () => {
        if (!customers || customers.length === 0) {
            toast({ title: "No data to analyze", description: "There are no AR customers to generate insights from.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        setInsights(null);

        try {
            // Convert Firestore Timestamps to serializable ISO strings before passing to the server action.
            const serializableCustomers = customers.map(customer => ({
                ...customer,
                buildCompleteDate: customer.buildCompleteDate?.toDate ? customer.buildCompleteDate.toDate().toISOString() : null,
                createdAt: customer.createdAt?.toDate ? customer.createdAt.toDate().toISOString() : null,
            }));

            const result = await getArCollectionsInsights({ customers: serializableCustomers as any });
            setInsights(result);
        } catch (error: any) {
            toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="bg-muted/30">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-yellow-400" />
                        AI Collections Assistant
                    </CardTitle>
                    <CardDescription>Get AI-powered insights and suggestions for your collections.</CardDescription>
                </div>
                <Button onClick={handleGetInsights} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Zap className="mr-2" />}
                    {isLoading ? 'Analyzing...' : 'Get Insights'}
                </Button>
            </CardHeader>
            {insights && (
                <CardContent className="space-y-4 animate-in fade-in-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Alert>
                            <Target className="h-4 w-4" />
                            <AlertTitle>Key Insight</AlertTitle>
                            <AlertDescription className="break-words">{insights.keyInsight}</AlertDescription>
                        </Alert>
                         <Alert>
                            <BarChart className="h-4 w-4" />
                            <AlertTitle>Collection Health Score: {insights.collectionHealthScore}/100</AlertTitle>
                            <AlertDescription className="break-words">
                                A score representing the overall health of your collections process.
                            </AlertDescription>
                        </Alert>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Activity />
                                Priority Actions
                            </CardTitle>
                             <CardDescription>A short list of the top customers to focus on now.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {insights.priorityActions.map((action, index) => (
                                <div key={index} className="min-w-0 p-4 rounded-lg border bg-background/50 flex flex-col gap-2">
                                    <h4 className="font-semibold">{action.customerName}</h4>
                                    <dl className="text-sm space-y-2">
                                        <div className="space-y-1">
                                            <dt className="font-medium text-muted-foreground">Reason</dt>
                                            <dd className="break-words">{action.reason}</dd>
                                        </div>
                                         <div className="space-y-1">
                                            <dt className="font-medium text-muted-foreground">Suggestion</dt>
                                            <dd className="font-semibold text-amber-600 break-words">{action.suggestedAction}</dd>
                                        </div>
                                    </dl>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </CardContent>
            )}
        </Card>
    );
}
