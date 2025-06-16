// Create valid token for irtiza user
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

const user = {
  id: 'cmby0dl470000v2u0a93kq7gw',
  username: 'irtiza',
  email: 'irtiza@example.com',
  role: 'ADMIN'
};

const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

console.log('Token for irtiza:');
console.log(token);