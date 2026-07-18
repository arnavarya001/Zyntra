const API_URL = 'http://localhost:3001';

async function runTests() {
  console.log('Starting API tests using global fetch...');
  const testHandle = `test_${Date.now()}`;
  
  try {
    // 1. Test Register
    console.log('\n--- Testing Registration ---');
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: testHandle,
        name: 'Test User',
        age: 25,
        bio: 'Hello world!',
        gender: 'Male',
        preference: 'Female',
        password: 'password123'
      })
    });
    
    console.log('Register Status:', registerRes.status);
    const registerData = await registerRes.json();
    console.log('Register Data:', registerData);
    
    if (!registerRes.ok) {
      throw new Error(`Registration failed: ${JSON.stringify(registerData)}`);
    }
    
    const token = registerData.token;
    
    // 2. Test Get Profile
    console.log('\n--- Testing Get Profile ---');
    const profileRes = await fetch(`${API_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Profile Status:', profileRes.status);
    const profileData = await profileRes.json();
    console.log('Profile Data:', profileData);
    
    // 3. Test Get Potential Matches
    console.log('\n--- Testing Potential Matches ---');
    const usersRes = await fetch(`${API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Matches Status:', usersRes.status);
    const usersData = await usersRes.json();
    console.log('Potential Matches count:', usersData.users ? usersData.users.length : 0);
    if (usersData.users && usersData.users.length > 0) {
      console.log('First potential match:', usersData.users[0]);
    }
    
    // 4. Test Interact (Like the first match if available)
    if (usersData.users && usersData.users.length > 0) {
      const targetId = usersData.users[0].id;
      console.log(`\n--- Testing Interact (Like user ID: ${targetId}) ---`);
      const interactRes = await fetch(`${API_URL}/api/interact`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ target_id: targetId, type: 'like' })
      });
      console.log('Interact Status:', interactRes.status);
      const interactData = await interactRes.json();
      console.log('Interact Data:', interactData);
    }
    
    // 5. Test Get Mutual Matches
    console.log('\n--- Testing Get Mutual Matches ---');
    const matchesRes = await fetch(`${API_URL}/api/matches`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Matches Status:', matchesRes.status);
    const matchesData = await matchesRes.json();
    console.log('Matches Data:', matchesData);

    console.log('\nAll tests completed successfully!');
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

runTests();
