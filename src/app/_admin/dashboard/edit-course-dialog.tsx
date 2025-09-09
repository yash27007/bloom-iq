'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTRPC } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Role } from '@/generated/prisma';
import { UserSelector } from './user-selector';

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

interface EditCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course | null;
  onSuccess: () => void;
}

export default function EditCourseDialog({
  open,
  onOpenChange,
  course,
  onSuccess,
}: EditCourseDialogProps) {
  const [formData, setFormData] = useState({
    courseCode: '',
    courseName: '',
    courseCoordinatorId: '',
    moduleCoordinatorId: '',
    programCoordinatorId: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const trpc = useTRPC();

  const updateCourseMutation = useMutation(
    trpc.admin.updateCourse.mutationOptions({
      onSuccess: () => {
        toast.success('Course updated successfully');
        onSuccess();
        onOpenChange(false);
        setIsLoading(false);
      },
      onError: (error: any) => {
        toast.error(error.message);
        setIsLoading(false);
      },
    })
  );

  useEffect(() => {
    if (course) {
      setFormData({
        courseCode: course.courseCode,
        courseName: course.courseName,
        courseCoordinatorId: course.courseCoordinatorId,
        moduleCoordinatorId: course.moduleCoordinatorId,
        programCoordinatorId: course.programCoordinatorId,
      });
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;

    setIsLoading(true);
    updateCourseMutation.mutate({
      id: course.id,
      ...formData,
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update the course information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="courseName">Course Name *</Label>
              <Input
                id="courseName"
                value={formData.courseName}
                onChange={(e) => handleInputChange('courseName', e.target.value)}
                placeholder="Enter course name"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="courseCode">Course Code *</Label>
              <Input
                id="courseCode"
                value={formData.courseCode}
                onChange={(e) => handleInputChange('courseCode', e.target.value)}
                placeholder="Enter course code (e.g., CS101)"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="courseCoordinatorId">Course Coordinator *</Label>
              <UserSelector
                value={formData.courseCoordinatorId}
                onValueChange={(value) => handleInputChange('courseCoordinatorId', value)}
                placeholder="Select course coordinator..."
                roleFilter={[Role.COURSE_COORDINATOR]}
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="moduleCoordinatorId">Module Coordinator *</Label>
              <UserSelector
                value={formData.moduleCoordinatorId}
                onValueChange={(value) => handleInputChange('moduleCoordinatorId', value)}
                placeholder="Select module coordinator..."
                roleFilter={[Role.MODULE_COORDINATOR]}
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="programCoordinatorId">Program Coordinator *</Label>
              <UserSelector
                value={formData.programCoordinatorId}
                onValueChange={(value) => handleInputChange('programCoordinatorId', value)}
                placeholder="Select program coordinator..."
                roleFilter={[Role.PROGRAM_COORDINATOR]}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !course}>
              {isLoading ? 'Updating...' : 'Update Course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
