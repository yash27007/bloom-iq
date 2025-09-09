'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Role } from '@/generated/prisma';
import { useTRPC } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

const editUserSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  facultyId: z.string().min(2, 'Faculty ID must be at least 2 characters').optional(),
  role: z.nativeEnum(Role).optional(),
});

type EditUserFormData = z.infer<typeof editUserSchema>;

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

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

export default function EditUserDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      facultyId: '',
      role: Role.COURSE_COORDINATOR,
    },
  });

  // Update form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        facultyId: user.facultyId,
        role: user.role,
      });
    }
  }, [user, form]);

  const trpc = useTRPC();
  const updateUserMutation = useMutation(
    trpc.admin.updateUser.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          toast.success(data.message || 'User updated successfully');
          onSuccess();
        } else {
          toast.error(data.message || 'Failed to update user');
        }
        setIsSubmitting(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update user');
        setIsSubmitting(false);
      },
    })
  );

  const onSubmit = (data: EditUserFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    updateUserMutation.mutate({
      id: user.id,
      ...data,
    });
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information. Leave fields unchanged to keep current values.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john.doe@college.edu"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facultyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Faculty ID</FormLabel>
                  <FormControl>
                    <Input placeholder="FAC001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(Role).map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
