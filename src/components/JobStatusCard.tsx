'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface JobStatusCardProps {
  jobId: string;
  onComplete?: () => void;
}

export function JobStatusCard({ jobId, onComplete }: JobStatusCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: job, isLoading, refetch } = trpc.questionJob.getJobStatus.useQuery(
    { jobId },
    {
      enabled: !!jobId,
      refetchInterval: autoRefresh ? 2000 : false, // Refresh every 2 seconds if auto-refresh is on
    }
  );

  // Stop auto-refresh when job is completed or failed
  useEffect(() => {
    if (job && (job.status === 'COMPLETED' || job.status === 'FAILED')) {
      setAutoRefresh(false);
      if (job.status === 'COMPLETED' && onComplete) {
        onComplete();
      }
    }
  }, [job, onComplete]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'PROCESSING':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'secondary';
      case 'PROCESSING':
        return 'default';
      case 'COMPLETED':
        return 'default';
      case 'FAILED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading job status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!job) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-500">
            <XCircle className="h-4 w-4" />
            <span>Job not found</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Question Generation Job</CardTitle>
            <CardDescription>
              {job.course.courseName} ({job.course.courseCode}) - Unit {job.unit}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={getStatusColor(job.status)} className="flex items-center space-x-1">
              {getStatusIcon(job.status)}
              <span>{job.status}</span>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          {job.status === 'PROCESSING' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{job.progress}%</span>
              </div>
              <Progress value={job.progress} className="w-full" />
            </div>
          )}

          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Material:</span>
              <p className="text-muted-foreground">{job.material?.title}</p>
            </div>
            <div>
              <span className="font-medium">Material Type:</span>
              <p className="text-muted-foreground">{job.material?.materialType}</p>
            </div>
            <div>
              <span className="font-medium">Started by:</span>
              <p className="text-muted-foreground">
                {job.initiatedBy.firstName} {job.initiatedBy.lastName}
              </p>
            </div>
            <div>
              <span className="font-medium">Started at:</span>
              <p className="text-muted-foreground">
                {format(new Date(job.createdAt), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>

          {/* Question Progress */}
          {job.totalQuestions > 0 && (
            <div className="flex justify-between text-sm">
              <span className="font-medium">Questions Generated:</span>
              <span>
                {job.generatedCount} / {job.totalQuestions}
              </span>
            </div>
          )}

          {/* Error Message */}
          {job.status === 'FAILED' && job.errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-700">Error:</span>
              </div>
              <p className="text-red-600 text-sm mt-1">{job.errorMessage}</p>
            </div>
          )}

          {/* Success Message */}
          {job.status === 'COMPLETED' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium text-green-700">
                  Successfully generated {job.generatedCount} questions!
                </span>
              </div>
            </div>
          )}

          {/* Last Updated */}
          <div className="text-xs text-muted-foreground">
            Last updated: {format(new Date(job.updatedAt), 'MMM dd, yyyy HH:mm:ss')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default JobStatusCard;
