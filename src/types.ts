export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

export interface Budget {
  id: number;
  user_id: number;
  amount: number;
  month: string;
  created_at: string;
}

export interface SavingsGoal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  created_at: string;
}
