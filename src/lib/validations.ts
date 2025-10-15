import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Expense title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(3, 'Currency must be at least 3 characters').max(3, 'Currency must be 3 characters'),
  splitType: z.enum(['equal', 'custom', 'percentage']),
  category: z.string().max(50, 'Category must be less than 50 characters').optional(),
});

export const addGroupMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
