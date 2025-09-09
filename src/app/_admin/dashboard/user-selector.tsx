'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import { Role } from '@/generated/prisma';

type User = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
};

interface UserSelectorProps {
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    roleFilter?: Role[];
    disabled?: boolean;
    className?: string;
}

export function UserSelector({
    value,
    onValueChange,
    placeholder = "Select user...",
    roleFilter,
    disabled = false,
    className,
}: UserSelectorProps) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const trpc = useTRPC();

    // Fetch users
    const { data: usersData, isLoading } = useQuery(
        trpc.admin.getUsers.queryOptions({
            page: 1,
            limit: 100, // Get more users for selection
            search: searchQuery || undefined,
            role: roleFilter?.length === 1 ? roleFilter[0] : undefined,
        })
    );

    const users = React.useMemo(() => usersData?.data || [], [usersData?.data]);
    const selectedUser = users.find(user => user.id === value);

    const filteredUsers = React.useMemo(() => {
        if (!roleFilter || roleFilter.length === 0) return users;
        return users.filter(user => roleFilter.includes(user.role));
    }, [users, roleFilter]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("justify-between", className)}
                    disabled={disabled}
                >
                    {selectedUser ? (
                        <div className="flex items-center gap-2">
                            <span className="truncate">
                                {selectedUser.firstName} {selectedUser.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                ({selectedUser.role.replace(/_/g, ' ')})
                            </span>
                        </div>
                    ) : (
                        placeholder
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
                <Command>
                    <CommandInput
                        placeholder="Search users..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {isLoading ? "Loading users..." : "No users found."}
                        </CommandEmpty>
                        <CommandGroup>
                            {filteredUsers.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={`${user.firstName} ${user.lastName} ${user.email}`}
                                    onSelect={() => {
                                        onValueChange(user.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === user.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {user.firstName} {user.lastName}
                                        </span>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>{user.email}</span>
                                            <span>•</span>
                                            <span className="capitalize">
                                                {user.role.replace(/_/g, ' ').toLowerCase()}
                                            </span>
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
