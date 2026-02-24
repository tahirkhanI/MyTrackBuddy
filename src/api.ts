const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const api = {
  auth: {
    login: async (data: any) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    },
    register: async (data: any) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Registration failed');
      return res.json();
    },
    me: async () => {
      const res = await fetch('/api/auth/me', { headers: getHeaders() });
      if (!res.ok) throw new Error('Unauthorized');
      return res.json();
    },
  },
  transactions: {
    list: async () => {
      const res = await fetch('/api/transactions', { headers: getHeaders() });
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    delete: async (id: number) => {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      return res.json();
    },
  },
  budgets: {
    list: async () => {
      const res = await fetch('/api/budgets', { headers: getHeaders() });
      return res.json();
    },
    save: async (data: any) => {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
  },
  savings: {
    list: async () => {
      const res = await fetch('/api/savings', { headers: getHeaders() });
      return res.json();
    },
    create: async (data: any) => {
      const res = await fetch('/api/savings', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return res.json();
    },
    contribute: async (id: number, amount: number) => {
      const res = await fetch(`/api/savings/${id}/contribute`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ amount }),
      });
      return res.json();
    },
  },
};
