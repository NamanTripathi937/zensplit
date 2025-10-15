export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  members: GroupMember[];
  expenses: Expense[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user: User;
  role: 'admin' | 'member';
  joinedAt: Date;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  paidBy: string;
  paidByUser: User;
  splitType: 'equal' | 'custom' | 'percentage';
  splits: ExpenseSplit[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  user: User;
  amount: number;
  percentage?: number;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// Global error typing helpers
export type AppError = { message: string } | Error | unknown;

export function toErrorMessage(error: AppError): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    // Handle common API error shapes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybe = error as any;
    if (maybe?.error && typeof maybe.error === 'string') return maybe.error;
    if (maybe?.message && typeof maybe.message === 'string') return maybe.message;
  } catch {}
  return 'Unexpected error';
}
