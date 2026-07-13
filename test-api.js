const run = async () => {
  try {
    const loginRes = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@authsphere.dev', password: 'Admin@123' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginData);
    
    if (loginData.accessToken) {
      const usersRes = await fetch('http://localhost:3000/users', {
        headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
      });
      const usersData = await usersRes.text();
      console.log('Users Status:', usersRes.status);
      console.log('Users Data:', usersData);
    }
  } catch (e) {
    console.error(e);
  }
};
run();
