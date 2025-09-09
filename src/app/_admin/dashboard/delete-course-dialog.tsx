'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

type Course = {
  id: string;
  courseCode: string;
  courseName: string;
  courseCoordinatorId: string;
  moduleCoordinatorId: string;
  programCoordinatorId: string;
  courseCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  moduleCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  programCoordinator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

interface DeleteCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  onSuccess: () => void;
}

export default function DeleteCourseDialog({
  open,
  onOpenChange,
  course,
  onSuccess,
}: DeleteCourseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const trpc = useTRPC();

  const deleteCourseMutation = useMutation(
    trpc.admin.deleteCourse.mutationOptions({
      onSuccess: () => {
        toast.success('Course deleted successfully');
        onSuccess();
        onOpenChange(false);
        setIsDeleting(false);
      },
      onError: (error: any) => {
        toast.error(error.message);
        setIsDeleting(false);
      },
    })
  );

  const handleDelete = async () => {
    if (!course) return;

    setIsDeleting(true);
    deleteCourseMutation.mutate({ id: course.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <DialogTitle>Confirm Deletion</DialogTitle>
          </div>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the course.
          </DialogDescription>
        </DialogHeader>

        {course && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Course Name:</span>
                <span className="text-sm">{course.courseName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Course Code:</span>
                <span className="text-sm">{course.courseCode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Course Coordinator:</span>
                <span className="text-sm">{course.courseCoordinator.firstName} {course.courseCoordinator.lastName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Module Coordinator:</span>
                <span className="text-sm">{course.moduleCoordinator.firstName} {course.moduleCoordinator.lastName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Program Coordinator:</span>
                <span className="text-sm">{course.programCoordinator.firstName} {course.programCoordinator.lastName}</span>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> Deleting this course will remove all associated data and cannot be reversed.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || !course}
          >
            {isDeleting ? 'Deleting...' : 'Delete Course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
