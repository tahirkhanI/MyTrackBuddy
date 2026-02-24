export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  amount: number;
  month: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  person: string;
  amount: number;
  type: 'lent' | 'borrowed';
  date: string;
  settled: boolean;
  created_at: string;
}
