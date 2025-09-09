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
import { Badge } from '@/components/ui/badge';
import { Role } from '@/generated/prisma';
import { useTRPC } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  facultyId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

const roleColors = {
  [Role.ADMIN]: 'bg-red-100 text-red-800',
  [Role.COURSE_COORDINATOR]: 'bg-blue-100 text-blue-800',
  [Role.MODULE_COORDINATOR]: 'bg-green-100 text-green-800',
  [Role.PROGRAM_COORDINATOR]: 'bg-purple-100 text-purple-800',
  [Role.CONTROLLER_OF_EXAMINATION]: 'bg-orange-100 text-orange-800',
};

export default function DeleteUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const trpc = useTRPC();

  const deleteUserMutation = useMutation(
    trpc.admin.deleteUser.mutationOptions({
      onSuccess: () => {
        toast.success('User deleted successfully');
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
    if (!user) return;

    setIsDeleting(true);
    deleteUserMutation.mutate({ id: user.id });
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
            This action cannot be undone. This will permanently delete the user account.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm">{user.firstName} {user.lastName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Faculty ID:</span>
                <span className="text-sm">{user.facultyId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Role:</span>
                <Badge className={roleColors[user.role]}>
                  {user.role.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">
                <strong>Warning:</strong> Deleting this user will remove all their data and cannot be reversed.
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
            disabled={isDeleting || !user}
          >
            {isDeleting ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
