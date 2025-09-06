// Mock authentication for testing
// This ensures the subscription modal opens for testing purposes

// Mock user for testing
window.mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  }
};

// Mock Supabase client for testing
if (!window.supabaseClient) {
  window.supabaseClient = {
    auth: {
      getUser: async () => ({
        data: { user: window.mockUser }
      })
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [] }) // No subscription = free plan
          })
        })
      })
    })
  };
}
